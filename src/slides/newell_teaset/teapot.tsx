import { Line, OrbitControls, PresentationControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC, Fragment } from 'react';
import { DoubleSide, Vector3 } from 'three';
import { Slide } from '../../SlideShow';
import teapot from './data/teapot?raw';
import { TAU, subdivide } from '../../utils/lib';
import { bernsteinPolynomials } from '../../utils/bernsteinPolynomials';
import { derivePoly, evalPolynomial } from '../../utils/Polynomial';
import { SurfaceGenerator, quadrangulate } from '../../SurfaceGeometry';

// -----------------------------------------------------------------------------

function parseModel(input: string) {
  const lines = input.trim().split(/\n|\r\n?/);
  const nPatches = Number.parseInt(lines.shift()!);
  const patches: number[][] = [];
  for (let i = 0; i < nPatches; i++) {
    // teaset data seems to use 1-based indices.  We use 0-based indices.
    patches.push(lines.shift()!.split(",").map(v => Number.parseInt(v) - 1));
  }
  const nPoints = Number.parseInt(lines.shift()!);
  const points: Vector3[] = [];
  for (let i = 0; i < nPoints; i++) {
    points.push(new Vector3(...lines.shift()!.split(",").map(Number.parseFloat)));
  }
  return {points, patches};
}

const {points, patches} = parseModel(teapot);

// -----------------------------------------------------------------------------

const schema = {
  scale: {label: "scale", value: 1, min: 0.1, max: 3},
  xShift: {label: "x shift", value:  0, min: -5, max: 5},
  yShift: {label: "y shift", value: -1, min: -5, max: 5},
  zShift: {label: "z shift", value: 0, min: -5, max: 5},
  showGrid: {label: "show grid", value: false},
  wireframe: false,
  roughness: {value: 0, min: 0, max: 1},
  metalness: {value: 0, min: 0, max: 1},
  color: {value: "#ffffff"},
};

const useTeapotControls = () => useControls("teapot", schema);

// -----------------------------------------------------------------------------

const bernstein3 = bernsteinPolynomials(4);
const bernstein3_1 = bernstein3.map(derivePoly);

const range4 = subdivide(0, 3, 3);
const nSteps = 20;
/**
 * `weightss[xIdx][i]` is a pair of weights of the `i`-th control point in
 * the sum for the `xIdx`-th vertex and its derivative.
 **/
const weightss = subdivide(0, 1, nSteps).map(x =>
  range4.map(i => [
    evalPolynomial(bernstein3[i], x),
    evalPolynomial(bernstein3_1[i], x),
  ]),
);
// use these to index into the outer level of `weightss`:
const stepIndices = subdivide(0, nSteps, nSteps);

const quadrangulateBezier = (points: Vector3[]): SurfaceGenerator =>
  quadrangulate(stepIndices, stepIndices, (xIdx, yIdx) => {
    const pos = new Vector3();
    const speed_u = new Vector3();
    const speed_v = new Vector3();
    let i = 0;
    for (const [wx, wx1] of weightss[xIdx]) {
      for (const [wy, wy1] of weightss[yIdx]) {
        pos.addScaledVector(points[i], wx * wy);
        speed_u.addScaledVector(points[i], wx1 * wy);
        speed_v.addScaledVector(points[i], wx * wy1);
        i++;
      }
    }
    const normal = new Vector3().crossVectors(speed_u, speed_v);
    if (normal.lengthSq() < 1e-10) {
      // Hack:
      // We are apparently at or near the axis where the "tangential" polynom
      // is (almost) constant and thus one of the speeds is (close to) zero.
      // In this case the cross product is not usable.
      normal.set(0, 0, pos.z < 1 ? 1 : -1);
    } else {
      normal.normalize();
    }
    return [pos, {normal}];
  });

// -----------------------------------------------------------------------------

export const Teapot : FC = () => {
  const {wireframe, roughness, metalness, color, showGrid} = useTeapotControls();
  return(<>
    <mesh>
      <surfaceGeometry args={[(args) => {
        // TODO precompute much of this
        for (const vertexIndices of patches) {
          quadrangulateBezier(vertexIndices.map(idx => points[idx]))(args);
        }
      }]}/>
      <meshStandardMaterial {...{wireframe, roughness, metalness, color}} side={DoubleSide}/>
    </mesh>

    {showGrid && patches.flatMap((ps, patchIdx) => range4.map(i => (
      <Fragment key={JSON.stringify([patchIdx, i])}>
        <Line points={range4.map(j => points[ps[4*i+j]])} color={["#00f", "#f00"][isOuter(i)]}/>
        <Line points={range4.map(j => points[ps[4*j+i]])} color={["#00f", "#f00"][isOuter(i)]}/>
      </Fragment>
    )))}
    {// The sample patch:
    showGrid && range4.map(i => (
      <Fragment key={i}>
        <Line points={range4.map(j => [i/8-2, 0, j/8+2.75])} color={["#00f", "#f00"][isOuter(i)]}/>
        <Line points={range4.map(j => [j/8-2, 0, i/8+2.75])} color={["#00f", "#f00"][isOuter(i)]}/>
      </Fragment>
    ))}
  </>);
};

// -----------------------------------------------------------------------------

const isOuter = (i: number) =>  Number(i % 3 === 0);

export const TeapotSlide: FC = () => {
  const {scale, xShift, yShift, zShift} = useTeapotControls();
  return (
    <Slide>
      <div style={{
        zIndex: 1,
        position: "absolute", left: 30, top: 0, width: "25%", fontSize: 24,
        backgroundColor: "#0024",
      }}>
        <h2>The Utah Teapot</h2>
        <p>
          ...with Bezier surfaces.
        </p>
        <p>
          Check "show grid" to see the mesh of control points
          and "wireframe" to reveal the control mesh inside the pot.
        </p>
        <p>
          A sample grid above the teapot handle illustrates how each patch
          of the teapot surface is represented by 4x4 vertices:
          The outer vertices are connected by red lines, the inner
          vertices are connected by blue lines.
          (Some grid lines collapse into single points
          along the axis of the teapot.)
        </p>
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
            <Teapot/>
          </group>
        </PresentationControls>
      </Canvas>
    </Slide>
  );
};
