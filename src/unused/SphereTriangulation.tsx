import { OrbitControls, PresentationControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC } from 'react';
import { Euler, Vector3 } from 'three';
import { Slide } from '../SlideShow';
import { triangulate } from '../SurfaceGeometry';
import { TAU, subdivide } from '../utils/lib';

export const Octant : FC = () => {
  const rotations = [new Euler(0, 0, -TAU/4), new Euler(0.4*TAU, 0.06*TAU, 0.05*TAU)];
  const {n, useSines, normalize, autoNormals, pattern, fullSphere, rotation, wireframe, projection} = useControls("sphere triangulation", {
    n: {value: 9, min: 1, max: 40, step: 1},
    useSines: false,
    normalize: false,
    autoNormals: false,
    pattern: {value: "uniform", options: ["alternating", "rhombus", "zigzag"]},
    fullSphere: false,
    rotation: {value: 0, min: 0, max: rotations.length-1, step: 1},
    wireframe: false,
    projection: false,
  });
  const sinTable = subdivide(0, n, n).map(i => Math.sin(i/n * TAU/4));
  const signs = fullSphere ? [-1, 1] : [1];
  return(<>
    <mesh rotation={rotations[rotation]}>
      <surfaceGeometry args={[({addVertex, addTriangle}) => {
        const proj = projection && wireframe;
        // Projection implementation is hacky.  We are in surface-generating code
        // but want to emit lines.  The hack is to emit (almost) degenerate
        // triangles.  We use two slightly different center points to avoid
        // complete degeneration,  which would lead to the lines being rendered
        // black.
        const center1 = proj
          ? addVertex(new Vector3(), {normal: autoNormals ? undefined : new Vector3(0,0,1)})
          : undefined;
        const center2 = proj
          ? addVertex(new Vector3(0,0,1e-6), {normal: autoNormals ? undefined : new Vector3(0,0,1)})
          : undefined;
        signs.forEach(signX => signs.forEach(signY => signs.forEach(signZ => {
          const invert = signX * signY * signZ < 0;
          triangulate(n, {
            addVertexFromIndices: (i, j, k) => {
              let vec =
                useSines
                ? new Vector3(sinTable[i], sinTable[j], sinTable[k])
                : new Vector3(i, j, k).divideScalar(n);
              vec.multiply(new Vector3(signX, signY, signZ));
              const normal = vec.clone().normalize();
              const vector = (normalize ? normal : vec).multiplyScalar(2);
              const vertex = addVertex(
                vector,
                {normal: autoNormals ? undefined : normal},
              );
              if (proj) {
                addTriangle(center1!, center2!, vertex, {materialIndex: 4});
              }
              return vertex;
            },
            emitTriangle: (a: number, b: number, c: number, is: number, js: number, ks: number) => {
              const materialIndex =
                pattern == "alternating" ? (is % 3 === 1     ? 1 : 2) :
                pattern == "rhombus"     ? (ks % 2           ? 1 : 3) :
                pattern == "zigzag"      ? (ks >= 3*n - 10   ? 1 : 4) :
                0;
              addTriangle(a, b, c, {invert, materialIndex});
            },
          })
      })));
      }]} />
      {["#acf", "white", "#888", "#55f", "red"].map((color, i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color={color} wireframe={wireframe}/>
      ))}
    </mesh>
  </>);
};

export const SphereTriangulation: FC = () => (
  <Slide>
    <Canvas>
      <OrbitControls enableRotate={false /* leave rotation to PresentationControls */} />
      <ambientLight intensity={0.2} />
      <directionalLight intensity={1} color="#ccf" position={[-2, 0, 2]} />
      <color attach="background" args={["#002"]} />

      <PresentationControls
        global
        snap // just for temporary view adjustments
        azimuth={[-Math.PI, Math.PI]}
        polar={[-Math.PI / 2, Math.PI / 2]}
        speed={2}
      >
        <group rotation={[
          // Let the x/y plane appear almost horizontal (like paper on a desk)
          -.9 * TAU / 4,
          0,
          // ...and also a bit away from the y/z plane:
          -.8 * TAU / 8
        ]}>

          <Octant/>

        </group>
      </PresentationControls>
    </Canvas>
  </Slide>
);
