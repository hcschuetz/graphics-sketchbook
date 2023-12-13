import { OrbitControls, PresentationControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC } from 'react';
import { Vector3 } from 'three';
import { Slide } from '../../SlideShow';
import bunny from './data/bun_zipper.ply?raw';
import { parsePly } from './parsePly';

// Currently the bunny data is packed into the build in unparsed form and parsed
// by the client, which is perhaps the simplest approach.
//
// Alternatively we might
// - parse the data already at build time and pack a binary encoding
//   (to reduce package size and CPU usage)
// - or serve the (unparsed/ASCII or parsed/binary) data separately from the
//   build (allowing to serve other models without rebuilding).
//
// Or we might accept a .ply file dropped into the browser window by the user.

const bunnyElements = parsePly(bunny, "bunny");
// TODO check for expected structure
const bunnyData = Object.fromEntries(bunnyElements.map(el => [el.name, el.data]));

type Vertex = {x: number, y: number, z: number, confidence: number, intensity: number};
type Face = {vertex_indices: number[]};

const vertices = (bunnyData.vertex as Vertex[]).map(({x, y, z}) => new Vector3(x, y, z));
const faces = (bunnyData.face as Face[]).map(({vertex_indices}) => vertex_indices);

if (faces.some(f => f.length !== 3)) {
  throw new Error("non-triangle face found");
}

const schema = {
  scale: {label: "scale", value: 30, min: 0.1, max: 100},
  xShift: {label: "x shift", value: 0.025, min: -1, max: 1},
  yShift: {label: "y shift", value: -0.1, min: -1, max: 1},
  zShift: {label: "z shift", value: 0, min: -1, max: 1},
  mode: {value: 0, min: 0, max: 1, step: 1},
  smoothing: {value: 0, min: 0, max: 10},
  wireframe: false,
  roughness: {value: 0.5, min: 0, max: 1},
  metalness: {value: 0.25, min: 0, max: 1},
  color: {value: "#aa8844"}
};
const useBunnyControls = () => useControls("bunny", schema);

// Global variable to avoid repeated allocation.
let aux: {counters: number[], sums: Vector3[]} | undefined;

/** A straight-forward surface-smoothing algorithm.
 * The first parameter `vertices` will be modified in-place.
 */
// - It expects relatively uniform faces and edges (which is true for the bunny)
//   so that the smoothing will also be uniform.
//   Otherwise we would have to take into account non-uniformities of the grid.
//   Possible approaches:
//   - Use the discrete Laplace-Beltrami operator based on the cotangent formula.
//     (Notice that the cotangents can be computed without trig functions.
//     We only need to drop altitudes from a vertex to the opposite edges of its
//     adjacent triangles.)
//   - Currently a vertex is moved by the average of its outgoing edges.
//     - We might adjust these edges to uniform lengths before averaging.
//     - We might use (adjusted) angle bisectors of the corners, weighting them
//       by the angle sizes.
//   - We might compute a regression plane for all neighboring points and drop an
//     altitude from the vertex to this plane.
//   - ...
//   (A good solution should not depend on how fine or coarse the mesh is.
//   In particular if the mesh is finer in one surface direction and coarser in
//   the orthogonal surface direction, this should not have a significant impact
//   on the result.)
// - Hacky: Multiple calls to smooth() must use the same number of vertices.
//   (We anyway just use it for the bunny.)
// - TODO For efficiency, do this in WebGL.  (Does three.js support that?)
function smooth0(vertices: Vector3[], faces: number[][], smoothing: number): void {
  const {counters, sums} = aux ??= {
    counters: vertices.map(() => 0),
    sums: vertices.map(() => new Vector3()),
  };
  sums.forEach((vec, i) => {
    counters[i] = 0;
    vec.set(0, 0, 0);
  });
  for (const [a, b, c] of faces) {
    sums[a].add(vertices[b]); counters[a]++;
    sums[b].add(vertices[c]); counters[b]++;
    sums[c].add(vertices[a]); counters[c]++;
  }
  sums.forEach((vec, i) => {
    const c = counters[i];
    // This test is needed because some vertices have no attached faces/edges:
    if (c !== 0) {
      vertices[i].multiplyScalar(1 - smoothing).addScaledVector(vec, smoothing / c);
    }
  });
}

/** Sensitivity of the area of triangle pqr w.r.t. small movement of p */
function triangleAreaGradient(p: Vector3, q: Vector3, r: Vector3): Vector3 {
  /*
  As an intermediate result we compute the altitude between p and edge qr.
  Since the altitude foot f is on the line qr, there is some λ with
    f = q + λ(r-q)
  Furthermore the altitude pf is perpendicular to qr:
    (f-p)⋅(r-q) = 0
  We can eliminate f and solve for λ:
    ((q + λ(r-q)) - p)⋅(r-q) = 0
    (λ(r-q) - (p-q))⋅(r-q) = 0
    λ(r-q)⋅(r-q) - (p-q)⋅(r-q) = 0
    λ(r-q)⋅(r-q) = (p-q)⋅(r-q)
    λ = (p-q)⋅(r-q) / (r-q)⋅(r-q)
  Thus the altitude is:
  altitude = p - f
           = p - (q + λ(r-q))
           = (p-q) - λ(r-q)
  */
  const qr = new Vector3().subVectors(r, q);
  const qp = new Vector3().subVectors(p, q);
  const qrLengthSq = qr.lengthSq();
  const lambda = qp.dot(qr) / qrLengthSq;
  const altitude = qp.addScaledVector(qr, -lambda);

  /*
  The triangle area is
    ½ * |r-q| * |altitude|
  Thus the area varies with the altitude length, which varies with p moving in
  the altitude direction.
  (We could also argue geometrically: Arbitrary movements of p parallel to rq and
  infinitesimal movements of p perpendicular to the triangle area do not change
  the area.  Thus only movements of p in the altitude direction, which is
  perpendicular to the previous two directions, have an impact on the area.)
  So the gradient is
    ½ * |r-q| * ^altitude =                ("^" denotes normalization)
    ½ * |r-q| * altitude / |altitude| =
    (½ * |r-q| / |altitude|) * altitude
  */
  return altitude.multiplyScalar(0.5 * Math.sqrt(qrLengthSq) / altitude.length());
}

/** Smoothing based on area gradient. */
function smooth1(vertices: Vector3[], faces: number[][], smoothing: number): void {
  // This is a forward Euler step.
  // TODO Support the more stable (but also more complex) backward Euler stepping.
  // See the section on "mean curvature flow" in
  // http://www.cs.cmu.edu/~kmcrane/Projects/DDG/paper.pdf.
  const sums = vertices.map(() => new Vector3());
  sums.forEach((vec, i) => {
    vec.set(0, 0, 0);
  });
  for (const [a, b, c] of faces) {
    sums[a].sub(triangleAreaGradient(vertices[a], vertices[b], vertices[c]));
    sums[b].sub(triangleAreaGradient(vertices[b], vertices[c], vertices[a]));
    sums[c].sub(triangleAreaGradient(vertices[c], vertices[a], vertices[b]));
  }
  sums.forEach((vec, i) => {
    vertices[i].addScaledVector(sums[i], smoothing);
  });
}

export const Bunny : FC = () => {
  const {
    mode, smoothing, wireframe, roughness, metalness, color
  } = useBunnyControls();

  const verticesOut = vertices.map(vec => vec.clone());
  switch (mode) {
    case 0: {
      let smoothingRest = smoothing;
          while (smoothingRest >= 1) {
        smooth0(verticesOut, faces, 1);
        smoothingRest -= 1;
      }
      if (smoothingRest > 0) {
        smooth0(verticesOut, faces, smoothingRest);
      }    
      break;
    }
    case 1: {
      // TODO do some looping
      smooth1(verticesOut, faces, smoothing / 10);
    }
  }

  return(<>
    <mesh>
      <surfaceGeometry args={[({addVertex, addTriangle}) => {
        verticesOut.forEach(v => addVertex(v));
        for (const [a, b, c] of faces) {
          addTriangle(a, b, c);
        }
      }]}/>
      <meshStandardMaterial {...{wireframe, roughness, metalness, color}}/>
    </mesh>
  </>);
};

export const BunnySlide: FC = () => {
  const {scale, xShift, yShift, zShift} = useBunnyControls();
  return (
    <Slide>
      <div style={{
        zIndex: 1,
        position: "absolute", left: 30, top: 0, width: "30%", fontSize: 24
      }}>
        <h2>The Stanford Bunny</h2>
        <p>
          ...with some experimental surface-smoothing algorithms.
        </p>
        <ul>
          <li>
            Move the "smoothing" slider in the control box.
          </li>
          <li>
            Select the other smoothing mode and see how smoothing overshoots
            at some point.
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
          <group scale={scale} position={
            // Scaling the position offsets (= shifts) because they are given
            // in the original coordinates:
            new Vector3(xShift, yShift, zShift).multiplyScalar(scale)
          }>
            <Bunny/>
          </group>
        </PresentationControls>
      </Canvas>
    </Slide>
  );
};
