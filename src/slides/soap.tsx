import { OrbitControls, PerspectiveCamera, PresentationControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC } from 'react';
import { DoubleSide, Vector3 } from 'three';
import { Slide } from '../SlideShow';
import { TAU, subdivide } from '../utils/lib';

const schema = {
  nRefinements: {label: "refinements", value: 6, min: 0, max: 8, step: 1},
  nSmoothings: {label: "sm. steps", value: 2, min: 0, max: 10, step: 1},
  wireframe: false,
  roughness: {value: 0.5, min: 0, max: 1},
  metalness: {value: 0.25, min: 0, max: 1},
  color: {value: "#ccc"},
  transparent: false,
  opacity: {value: 0.2, min: 0, max: 1},
};
const useSoapControls = () => useControls("soap", schema);

function borderVertex(fraction: number): Vector3 {
  const x = TAU * fraction;
  return new Vector3(3*Math.sin(x), 2*Math.sin(5*x), 3*Math.cos(x));

  // const f4 = fraction * 4;
  // const section = Math.floor(f4);
  // const sectionFraction = f4 - section;
  // const piSectionFraction = Math.PI * sectionFraction;
  // const sin = Math.sin(piSectionFraction);
  // const cos = Math.cos(piSectionFraction);
  // // A slightly different shape (with corners and straight boundary segments):
  // // const sin = 2 * (sectionFraction <= 0.5 ? sectionFraction : 1 - sectionFraction);
  // // const cos = 1 - 2 * sectionFraction;
  // switch (section) {
  //   case 0: return new Vector3(+1  , +sin, +cos);
  //   case 1: return new Vector3(+cos, -sin, -1  );
  //   case 2: return new Vector3(-1  , +sin, -cos);
  //   case 3: return new Vector3(-cos, -sin, +1  );
  //   default: throw new Error(`bad arg for borderVertex(): ${fraction}`)
  // }
}

// A straight-forward approach would have been to create the full network
// immediately and to smooth it in several steps.
// In contrast the optimized solution here starts with a very coarse network
// and refines it in several steps.  Some smoothing is performed after each
// refinement step.  Smoothing the coarser networks is not only cheaper
// but also more "far-reaching" than a smoothing step on the full network.

export const Soap : FC = () => {
  const {
    nRefinements, nSmoothings,
    wireframe, roughness, metalness, color, transparent, opacity
  } = useSoapControls();

  const tStart = performance.now();

  const vertices: Vector3[] = [];
  const mkVertex = (vec: Vector3) => vertices.push(vec) - 1;

  // Map vertex indices to border-position fractions in [0, 1):
  const borderVertices = new Map<number, number>();

  const triangles: [number, number, number][] = [];
  const mkTriangle = (a: number, b: number, c: number) =>
    triangles.push([a, b, c]);

  const initialBorder = subdivide(0, 5/6, 5).map(f => {
      const v = mkVertex(borderVertex(f));
      borderVertices.set(v, f);
      return v;
  });
  const center = mkVertex(
    initialBorder.reduce(
      (acc, v) => acc.add(vertices[v]),
      new Vector3(0, 0, 0)
    ).divideScalar(initialBorder.length)
  );

  initialBorder.forEach((v, i) =>
    mkTriangle(center, v, initialBorder[(i + 1) % 6])
  );

  /** Move each non-border vertex to the center of its 6 neighbors
   * (using those neighbors' old positions).
   */
  function smooth() {
    let maxSq = 0;
    const sums = vertices.map(() => new Vector3(0, 0, 0));
    for (const [a, b, c] of triangles) {
      // Only "pull" each vertex towards one neighbor vertex.
      // A neighbor triangle will pull the vertex towards the other neighbor vertex.
      sums[a].add(vertices[b]);
      sums[b].add(vertices[c]);
      sums[c].add(vertices[a]);
    };
    sums.forEach((s, i) => {
      if (!borderVertices.has(i)) {
        s.divideScalar(6);
        const v = vertices[i];
        maxSq = Math.max(maxSq, v.distanceToSquared(s));
        v.copy(s);
      }
    });
    console.log("smoothed",
      vertices.length, borderVertices.size, triangles.length, Math.sqrt(maxSq),
    );
  }

  /** Subdivide each triangle into 4 triangles. */
  function refine() {
    // Map a "sorted" combination of vertex indices to another vertex index:
    const edgeCenters = new Map<number, number>();
    function getEdgeCenter(a: number, b: number): number {
      const index = (Math.min(a, b) * (1 << 26)) + Math.max(a, b);
      if (edgeCenters.has(index)) {
        return edgeCenters.get(index)!;
      }
      let v: number;
      if (borderVertices.has(a) && borderVertices.has(b)) {
        // The current edge is a border edge.  Thus the center is
        // calculated and marked as a border point.
        const fa = borderVertices.get(a)!;
        const fb = borderVertices.get(b)!;
        const f = ((fa + fb + Number(Math.abs(fb - fa) > 0.5)) / 2) % 1;
        v = mkVertex(borderVertex(f));
        borderVertices.set(v, f);
      } else {
        v = mkVertex(vertices[a].clone().add(vertices[b]).multiplyScalar(0.5));
      }
      edgeCenters.set(index, v);
      return v;
    }

    // Iterate by index because the triangles array will grow:
    const nTriangles = triangles.length;
    for (let i = 0; i < nTriangles; i++) {
      const [a, b, c] = triangles[i];
      const ab = getEdgeCenter(a, b);
      const bc = getEdgeCenter(b, c);
      const ca = getEdgeCenter(c, a);
      mkTriangle(a, ab, ca);
      mkTriangle(b, bc, ab);
      mkTriangle(c, ca, bc);
      // one new triangle overwrites the old one:
      triangles[i] = [ab, bc, ca];
    }
  }

  for (let i = 0; i < nRefinements; i++) {
    refine();
    for (let j = 0; j < nSmoothings; j++) {
      smooth();
    }
  }
  // TODO Refine just along the border.
  // This allows to save some refinements for the entire surface.

  const tEnd = performance.now();
  console.log(`In ${tEnd - tStart} ms: ${
    nRefinements} refinement(s) @ ${nSmoothings} smoothing(s) => ${
    vertices.length} vertices (${borderVertices.size} border), ${triangles.length} triangles`);

  return(<>
    <mesh>
      <surfaceGeometry args={[({addVertex, addTriangle}) => {
        const vMap = vertices.map(v => addVertex(v));
        triangles.forEach(([a, b, c]) => addTriangle(vMap[a], vMap[b], vMap[c]));
      }]}/>
      <meshStandardMaterial
        {...{ wireframe, roughness, metalness, color, transparent, opacity }}
        side={DoubleSide}
      />
    </mesh>
  </>);
};

export const SoapSlide: FC = () => {
  return (
    <Slide>
      <div style={{
        zIndex: 1,
        position: "absolute", left: 30, top: 0, width: "30%", fontSize: 24
      }}>
        <h2>Soap Film</h2>
        <p>
          A home-grown algorithm simulates how a soap film, a rubber sheet
          or certain elastic textiles might behave when attached to a
          wire frame of some given shape.
        </p>
      </div>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 10]}/>
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
          <Soap/>
        </PresentationControls>
      </Canvas>
    </Slide>
  );
};
