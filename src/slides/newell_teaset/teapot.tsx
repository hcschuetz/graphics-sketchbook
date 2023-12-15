import { Line, OrbitControls, PresentationControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC, Fragment, useState } from 'react';
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
  zShift: {label: "z shift", value: -.5, min: -5, max: 5},
  showGrid: {label: "show grid", value: "none", options: ["none", "highlighted", "all"]},
  wireframe: false,
  roughness: {value: 0.47, min: 0, max: 1},
  metalness: {value: 0.96, min: 0, max: 1},
  color: {value: "#f58542"},
  highlight: {value: "#fffaf2"},
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
  const {wireframe, roughness, metalness, color, highlight, showGrid} = useTeapotControls();
  const [highlighted, setHighlighted] = useState<number | undefined>();
  console.log("highlighted", highlighted)
  return(<>
    {patches.map((vertexIndices, i) =>
      <mesh key={i}
        onPointerDown={e => {
          e.stopPropagation();
          setHighlighted(i === highlighted ? undefined : i);
        }}
      >
        <surfaceGeometry args={[(args) => {
          quadrangulateBezier(vertexIndices.map(idx => points[idx]))(args);
        }]}/>
        <meshStandardMaterial {...{wireframe, roughness, metalness}}
          color={i === highlighted ? highlight : color}
          side={DoubleSide}
        />
      </mesh>
    )}

    {patches.flatMap((ps, patchIdx) =>
      (showGrid === "all" || showGrid === "highlighted" && patchIdx === highlighted)
      ? ["#f00", "#00f", "#00f", "#f00"].map((color, i) => (
        <Fragment key={JSON.stringify([patchIdx, i])}>
          <Line points={range4.map(j => points[ps[4*i+j]])} color={color}/>
          <Line points={range4.map(j => points[ps[4*j+i]])} color={color}/>
        </Fragment>
      ))
      : []
    )}
  </>);
};

// -----------------------------------------------------------------------------

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
          ...consisting of Bezier surfaces.
        </p>
        <p>
          Click any point on the pot to highlight/unhighlight
          the corresponding Bezier patch. 
        </p>
        <p>
          Change "show grid" in the config box
          to see the mesh of control points
          and check "wireframe"
          to reveal the control mesh inside the pot.
        </p>
        <p>
          Each patch is represented by 4x4 vertices.
          The visualization
          connects the outer vertices with red lines
          and the inner ones with blue lines.
          (Some of these lines collapse into single points
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
