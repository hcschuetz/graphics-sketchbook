import { Line, OrbitControls, PresentationControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC } from 'react';
import { DoubleSide, Vector3 } from 'three';
import { Slide } from '../SlideShow';
import { TAU, subdivide } from '../utils/lib';
import { SurfaceGenerator } from '../SurfaceGeometry';

// -----------------------------------------------------------------------------
// First approach:
// - vertex on top
// - layers with 1, 5, 5, 1 vertices

const northPole = new Vector3(0, 0, 1);
const southPole = new Vector3(0, 0,-1);
const height = Math.sqrt(1/5);
const radius = 2 * height;
// The calculations only require basic arithmetics and square roots.
// But trigonometric functions should be easier to understand:
const nonPoles = subdivide(0, 9, 9).map(i => new Vector3(
  radius * Math.cos(TAU/10 * i),
  radius * Math.sin(TAU/10 * i),
  height * (-1)**i,  // or equivalently: h * Math.cos(TAU/2 * i)
));

const icosahedronSurface0: SurfaceGenerator = ({addVertex, addTriangle}) => {
  const emit = (a: Vector3, b: Vector3, c: Vector3) =>
    addTriangle(addVertex(a), addVertex(b), addVertex(c));
  for (let i = 0; i < 10; i += 2) {
    const [upper0, lower1, upper2, lower3] =
      [0, 1, 2, 3].map(j => nonPoles[(i+j) % 10]);
    emit(northPole, upper0, upper2   );
    emit(lower1   , upper0, upper2   );
    emit(lower1   , lower3, upper2   );
    emit(lower1   , lower3, southPole);
  };
};

// -----------------------------------------------------------------------------
// Second approach:
// - inscribed in a cube
// - edge on top
// - layers with 2, 2, 4, 2, 2 vertices

const a = (Math.sqrt(5)-1)/2; // golden ratio

const dims = [0, 1, 2];
const dirs = [-1, 1];

const icosahedronSurface1: SurfaceGenerator = ({addVertex, addTriangle}) => {
  for (const x of dirs) {
    for (const y of dirs) {
      for (const z of dirs) {
        addTriangle(
          addVertex(new Vector3(x    , y * a, 0    )),
          addVertex(new Vector3(x * a, 0    , z    )),
          addVertex(new Vector3(0    , y    , z * a)),
        );
      }
    }
  }
  for (const dim1 of dims) {
    const dim2 = (dim1 + 1) % 3;
    const dim3 = (dim1 + 2) % 3;
    for (const dir of dirs) {
      for (const dir2 of dirs) {
        const p1 = new Vector3();
        const p2 = new Vector3();
        const p3 = new Vector3();

        p1.setComponent(dim1, dir);
        p1.setComponent(dim2, a * dir2);

        p2.setComponent(dim1, dir);
        p2.setComponent(dim2, a * -dir2);

        p3.setComponent(dim1, a * dir);
        p3.setComponent(dim3, dir2);

        addTriangle(
          addVertex(p1),
          addVertex(p2),
          addVertex(p3),            
        );
      }
    }
  }
};

// -----------------------------------------------------------------------------
// Third approach:
// - face on top
// - layers with 3, 3, 3 vertices

// TODO find and use exact parameter values

// top and bottom layer
const height1 = 1;
const radius1 = 3 -  Math.sqrt(5);
const group1 = subdivide(0, 5, 5).map(i => new Vector3(
  radius1 * Math.cos(TAU/6 * i),
  radius1 * Math.sin(TAU/6 * i),
  height1 * (-1)**i,
));

// inner layers
const height2 = 2 - Math.sqrt(5);
const radius2 = Math.sqrt(5) - 1;
const group2 = subdivide(0, 5, 5).map(i => new Vector3(
  radius2 * Math.cos(TAU/6 * i),
  radius2 * Math.sin(TAU/6 * i),
  height2 * (-1)**i,
));

const icosahedronSurface2: SurfaceGenerator = ({addVertex, addTriangle}) => {
  const emit = (a: Vector3, b: Vector3, c: Vector3) =>
    addTriangle(addVertex(a), addVertex(b), addVertex(c));
  emit(group1[0], group1[2], group1[4]);
  for (let i = 0; i < 6; i += 2) {
    const [top0, bot1, top2, bot3] = [0, 1, 2, 3].map(j => group1[(i+j) % 6]);
    const [lower0, upper1, lower2] = [0, 1, 2   ].map(j => group2[(i+j) % 6]);
    emit(top0, top2  , upper1);
    emit(top0, lower0, upper1);
    emit(top2, lower2, upper1);
    emit(bot1, lower2, upper1);
    emit(bot1, upper1, lower0);
    emit(bot1, bot3  , lower2);
  };
  emit(group1[1], group1[3], group1[5]);
};

// -----------------------------------------------------------------------------

const geometries = [icosahedronSurface0, icosahedronSurface1, icosahedronSurface2];

const schema = {
  scale: {label: "scale", value: 1.5, min: 0.1, max: 3},
  xShift: {label: "x shift", value: 0, min: -5, max: 5},
  yShift: {label: "y shift", value: 0, min: -5, max: 5},
  zShift: {label: "z shift", value: 0, min: -5, max: 5},
  box: false,
  geometry: {value: 1, min: 1, max: geometries.length, step: 1},
  wireframe: false,
  roughness: {value: 0.5, min: 0, max: 1},
  metalness: {value: 0.7, min: 0, max: 1},
  color: {value: "#3b3"},
};

// -----------------------------------------------------------------------------

const useIcosahedronControls = () => useControls("icosahedron", schema);

export const Icosahedron : FC = () => {
  const {geometry, wireframe, roughness, metalness, color} = useIcosahedronControls();
  return(<>
    <mesh>
      <surfaceGeometry args={[geometries[geometry-1]]}/>
      <meshStandardMaterial {...{wireframe, roughness, metalness, color}}
        side={DoubleSide}
      />
    </mesh>
  </>);
};

const Box : FC = () => (<>{
  dims.flatMap(dim1 => {
    const dim2 = (dim1 + 1) % 3;
    const dim3 = (dim1 + 2) % 3;
    return dirs.flatMap(dir2 =>
      dirs.map(dir3 => {
        const p1 = new Vector3();
        p1.setComponent(dim1, 1);
        p1.setComponent(dim2, dir2);
        p1.setComponent(dim3, dir3);
        const p2 = new Vector3();
        p2.setComponent(dim1, -1);
        p2.setComponent(dim2, dir2);
        p2.setComponent(dim3, dir3);
        return (
          <Line key={`${dim1},${dir2},${dir3}`}
            points={[p1, p2]}
            color="#fff"
          />
        );
      })  
    )}
  )
}</>);

// -----------------------------------------------------------------------------

export const IcosahedronSlide: FC = () => {
  const {scale, xShift, yShift, zShift, box} = useIcosahedronControls();
  return (
    <Slide>
    <div style={{
      zIndex: 1,
      position: "absolute", left: 30, top: 0, width: "30%", fontSize: 18
    }}>
      <h2>Icosahedron</h2>
      <p>
        Various ways to construct an icosahedron.
      </p>
      <ul>
        <li>
          Geometry #1: 5 groups of 4 triangles;
          each group connects the "north pole" with the "south pole".
          <br/>
          (circumradius = 1)
        </li>
        <li>
          Geometry #2: Each face of the bounding box contains an edge
          of the icosahedron.
          <br/>
          (midradius = 1)
        </li>
        <li>
          Geometry #3: The top face and the bottom face of the box
          each contain a face of the icosahedron.
          The remaining 6 vertices form a "wobbly equator".
          <br/>
          (inradius = 1)
        </li>
      </ul>
    </div>
      <Canvas>
        <OrbitControls enableRotate={false /* leave rotation to PresentationControls */} />
        <ambientLight intensity={0.2} />
        <directionalLight intensity={1} color="#ccf" position={[-2, 0, 2]} />
        <directionalLight intensity={0.5} color="#ccf" position={[ 2, 0, 5]} />
        <color attach="background" args={["#002"]} />

        <PresentationControls
          global
          snap // just for temporary view adjustments
          azimuth={[-Math.PI, Math.PI]}
          polar={[-Math.PI / 2, Math.PI / 2]}
          speed={2}
        >
          <group scale={scale} rotation={[-0.15*TAU, 0, 0]} position={
            // Scaling the position offsets (= shifts) because they are given
            // in the original coordinates:
            new Vector3(xShift, yShift, zShift).multiplyScalar(scale)
          }>
            {box && <Box/>}
            <Icosahedron/>
          </group>
        </PresentationControls>
      </Canvas>
    </Slide>
  );
};
