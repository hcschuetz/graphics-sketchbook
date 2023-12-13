import { ThreeEvent } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC, useCallback, useMemo, useState } from 'react';
import { DoubleSide, Vector3 } from 'three';
import { quadrangulate, roundedBoxSurfaceGenerator, triangulate } from '../SurfaceGeometry';
import { TAU, subdivide } from '../utils/lib';

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
    nStepsBox, radius, boxRoughness
  } = useControls("buzzer", {
    wireframe: false,

    nStepsCap: {label: "#steps cap", value: 20, min: 1, max: 40, step: 1},
    useSinesCap: true,
    capRoughness: {value: 0.65, min: 0, max: 1},
    capMetalness: {value: 0.6, min: 0, max: 1},

    nStepsBox: {label: "#steps box", value: 3, min: 1, max: 50, step: 1},
    radius: {value: 0.04, min: 0, max: 0.4},
    boxRoughness: {value: 0.2, min: 0, max: 1},
  });

  const boxRadii = new Vector3(1, 1, 1).multiplyScalar(radius);

  const capSteps = useMemo(() =>
    Array.from({length: nStepsCap+1}, (_, i) => {
      const frac = i/nStepsCap;
      return useSinesCap ? Math.sin(TAU/4 * frac) : frac;
    }), [nStepsCap, useSinesCap]);

  return(<>
    <mesh position={[0, 0, pressed ? 0.05  : 0.10]}
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
