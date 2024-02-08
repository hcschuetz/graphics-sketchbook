import { Line, OrbitControls, PresentationControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC } from 'react';
import { Vector3 } from 'three';
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
    emit(upper2, northPole, upper0);
    emit(upper0,  lower1  , upper2);
    emit(lower3,  upper2  , lower1);
    emit(lower1, southPole, lower3);
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
          {invert: x*y*z > 0}
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
          {invert: dir > 0},
          // "brute-force" test:
          // {invert: p1.clone().cross(p2).dot(p3) < 0},
        );
      }
    }
  }
};

// -----------------------------------------------------------------------------
// Third approach:
// - face on top
// - layers with 3, 3, 3, 3 vertices

const r3 = Math.sqrt(3);
const cosines = [1, -1/2,  -1/2];
const sines   = [0, r3/2, -r3/2];

const r5 = Math.sqrt(5);
const heights = [     1, r5 - 2, 2 - r5, -1     ];
const radii   = [r5 - 3, r5 - 1, 1 - r5,  3 - r5];

const minus = ({x, y, z}: Vector3): Vector3 => new Vector3(-x, -y, -z);
function vertex(layer: number, rot: number): Vector3 {
  const r = radii[layer], t = rot % 3;
  return new Vector3(r * cosines[t], r * sines[t], heights[layer]);
}

const icosahedronSurface2: SurfaceGenerator = ({addVertex, addTriangle}) => {
  function emitTwoTriangles(a: Vector3, b: Vector3, c: Vector3) {
    // The given triangle...
    addTriangle(addVertex(      a ), addVertex(      b ), addVertex(      c ));
    // ...and its antipodal:
    addTriangle(addVertex(minus(c)), addVertex(minus(b)), addVertex(minus(a)));
  }
  emitTwoTriangles(vertex(0, 0), vertex(0, 1), vertex(0, 2));
  for (const rot of [0, 1, 2]) {
    const V00 = vertex(0, rot), V01 = vertex(0, rot+1),
                    V12 = vertex(1, rot+2),
          V20 = vertex(2, rot), V21 = vertex(2, rot+1);
    emitTwoTriangles(V12, V00, V20);
    emitTwoTriangles(V12, V01, V00);
    emitTwoTriangles(V12, V21, V01);
  }
}

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
      <meshStandardMaterial {...{wireframe, roughness, metalness, color}}/>
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
