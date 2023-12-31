import { OrbitControls, PresentationControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC, useCallback } from 'react';
import { Vector3 } from 'three';
import { Slide } from '../SlideShow';
import { Buzzer } from './Buzzer';
import { TAU } from '../utils/lib';

const schema = {
  scale: {label: "scale", value: 1.6, min: 0.1, max: 4},
  xShift: {label: "x shift", value: 0.8, min: -1, max: 1},
  yShift: {label: "y shift", value: -0.1, min: -1, max: 1},
  zShift: {label: "z shift", value: 0, min: -1, max: 1},
};
const useBuzzerControls = () => useControls("buzzer-pos", schema);

export const BuzzerSlide: FC = () => {
  const {scale, xShift, yShift, zShift} = useBuzzerControls();
  return (
    <Slide>
      <div style={{
        zIndex: 1,
        position: "absolute", left: 30, top: 0, width: "42%", fontSize: 24,
        backgroundColor: "#0028",
      }}>
        <h2>A Hemisphere and a Rounded Box</h2>
        <ul>
          <li>Play with the controls in the config box.</li>
          <li>Press the buzzer.</li>
          <li>
            See <a href="https://github.com/hcschuetz/octasphere">this
            project</a> for more details on rendering spheres and corners of
            rounded boxes.</li>
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
          <group scale={scale} rotation={[-0.2*TAU, 0, 0.08*TAU]} position={
            // Scaling the position offsets (= shifts) because they are given
            // in the original coordinates:
            new Vector3(xShift, yShift, zShift).multiplyScalar(scale)
          }>
            <Buzzer onPress={useCallback(() => {
              const audioCtx = new window.AudioContext();
              const oscillator = audioCtx.createOscillator();
              oscillator.type = "square";
              oscillator.frequency.setValueAtTime(50, audioCtx.currentTime);
              oscillator.connect(audioCtx.destination);
              oscillator.start();
              setTimeout(() => oscillator.stop(), 500);
            }, [])} />
          </group>
        </PresentationControls>
      </Canvas>
    </Slide>
  );
};
