import { ThreeEvent } from '@react-three/fiber';
import { Line, Sphere } from '@react-three/drei';
import { useControls } from 'leva';
import { FC, Fragment, useCallback, useMemo, useState } from 'react';
import { DoubleSide, MeshStandardMaterial, Vector3 } from 'three';
import { quadrangulate, roundedBoxSurfaceGenerator, triangulate } from '../SurfaceGeometry';
import { TAU, subdivide } from '../utils/lib';


const controls = {
  wireframe: false,

  nStepsCap: {label: "#steps cap", value: 20, min: 1, max: 40, step: 1},
  useSinesCap: true,
  capRoughness: {value: 0.65, min: 0, max: 1},
  capMetalness: {value: 0.6, min: 0, max: 1},

  showGeodesics: false,

  nStepsBox: {label: "#steps box", value: 3, min: 1, max: 50, step: 1},
  radius: {value: 0.04, min: 0, max: 0.4},
  boxRoughness: {value: 0.2, min: 0, max: 1},
};

export const Buzzer : FC<{
  onPress  ?: (e: ThreeEvent<PointerEvent>) => void,
  onRelease?: (e: ThreeEvent<PointerEvent>) => void,
}> = ({onPress, onRelease}) => {
  const [pressed, setPressed] = useState(false);

  const press = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (pressed) return;
    setPressed(true);
    onPress && onPress(e);
  }, [pressed]);

  const release = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!pressed) return;
    setPressed(false);
    onRelease && onRelease(e);
  }, [pressed]);

  const {
    wireframe,
    nStepsCap, useSinesCap, capRoughness, capMetalness,
    showGeodesics,
    nStepsBox, radius, boxRoughness
  } = useControls("buzzer", controls);

  const boxRadii = new Vector3(1, 1, 1).multiplyScalar(radius);

  const capSteps = useMemo(() =>
    Array.from({length: nStepsCap+1}, (_, i) => {
      const frac = i/nStepsCap;
      return useSinesCap ? Math.sin(TAU/4 * frac) : frac;
    }), [nStepsCap, useSinesCap]);

  return(<>
    <group position={[0, 0, pressed ? 0.05 : 0.10]}>
      <mesh
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
      >
        <surfaceGeometry args={[({addVertex, addTriangle}) =>
          [-1, 1].flatMap(signX =>
            [-1, 1].flatMap(signY => {
              const invert = signX * signY < 0;
              triangulate(nStepsCap, {
                addVertexFromIndices: (i, j, k) => {
                  const v = new Vector3(
                    signX * capSteps[i],
                    signY * capSteps[j],
                    capSteps[k]
                  ).normalize();
                  return addVertex(v, {normal: v});
                },
                emitTriangle: (a, b, c) => addTriangle(a, b, c, {invert}),
              });
            })
          )
        ]} />
        <meshStandardMaterial
          color="red"
          wireframe={wireframe}
          metalness={capMetalness}
          roughness={capRoughness}
          side={DoubleSide}
        />
      </mesh>
      {showGeodesics &&
        <group rotation={[0, 0, TAU/2]}>
          <Geodesics/>
        </group>
      }
    </group>
    <mesh>
      <surfaceGeometry args={[roundedBoxSurfaceGenerator(
        new Vector3(-1, -1, -0.8).add(boxRadii),
        new Vector3(1, 1, 0).sub(boxRadii),
        boxRadii,
        nStepsBox,
      )]}/>
      <meshStandardMaterial color="grey" wireframe={wireframe} roughness={boxRoughness}/>
    </mesh>
    <mesh>
      <surfaceGeometry args={[quadrangulate(
        subdivide(0, TAU, 100),
        [0, 0.4],
        (phi, z) => new Vector3(0.6 * Math.cos(phi), 0.6 * Math.sin(phi), z),
      )]} />
      <meshStandardMaterial color="#444" wireframe={wireframe}/>
    </mesh>
  </>);
};


// ---------------------------------------------------------------------------
// The following display of subdivided geodesics is for comparison with
// https://prideout.net/blog/octasphere and
// https://catlikecoding.com/unity/tutorials/procedural-meshes/geodesic-octasphere/

// <Line/>s take colors but <Sphere/>s take materials.
const colors = ["cyan", "magenta", "yellow"];
const materials = colors.map(color => new MeshStandardMaterial({color}));

function geodesicPoints(from: Vector3, to: Vector3, nSteps = 0): Vector3[] {
  const result: Vector3[] = [];

  const axis = new Vector3().crossVectors(from, to).normalize();
  const angle = from.angleTo(to);
  if (nSteps === 0) {
    // It's for a circle segment.  Let's use bendings < 5°.
    nSteps = Math.ceil(angle * (360 / TAU / 5));
  }
  const step = angle / nSteps;

  const v = from.clone();
  for (let i = 0; i <= nSteps; i++) {
    result.push(v.clone());
    v.applyAxisAngle(axis, step);
  }
  result.push(to.clone());

  return result;
}

function Geodesics() {
  const {nStepsCap} = useControls("buzzer", controls);
  return subdivide(0, 1, nStepsCap).flatMap((u, i) => {
    const sin = Math.sin(u * (TAU/4));
    const cos = Math.cos(u * (TAU/4));
    return [
      [new Vector3(sin, cos,  0 ), new Vector3(sin,  0 , cos)],
      [new Vector3( 0 , sin, cos), new Vector3(cos, sin,  0 )],
      [new Vector3(cos,  0 , sin), new Vector3( 0 , cos, sin)],
    ].map(([from, to], j) => {
      const color = colors[j]
      return (
        <Fragment key={`${i}-${j}`}>
          <Line points={geodesicPoints(from, to)} color={color}/>
          {geodesicPoints(from, to, nStepsCap - i).map((p, k) => (
            <Sphere key={k}
              material={materials[j]}
              position={p}
              scale={0.01}
            />
          ))}
        </Fragment>
      );
    });
  })
}