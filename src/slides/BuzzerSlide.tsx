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
        <h2>A Hemisphere and a Box</h2>
        <ul>
          <li>Play with the controls in the config box.</li>
          <li>Press the buzzer.</li>
        </ul>
        <div style={{fontSize: "70%"}}>
          <p>
            Apparently I have re-invented
            what is called an "octasphere" elsewhere,
            for example
            {} <a href="https://prideout.net/blog/octasphere/">here</a>,
            {} <a href="https://catlikecoding.com/unity/tutorials/procedural-meshes/octasphere/">here</a>,
            and <a href="https://catlikecoding.com/unity/tutorials/procedural-meshes/geodesic-octasphere/">here</a>.
          </p>
          <p>
            There is a subtle aspect regarding the placement of auxiliary vertices.
            To see it,
            check the "showGeodesics" toggle
            in the config box
            and set "#steps cap" (the resolution)
            to a smaller number, but at least 3.
          </p>
          <p>
            The yellow vertices are computed by evenly subdividing the yellow
            geodesics connecting corresponding points on the two evenly
            subdivided meridians.
            But one could, with equal justification, connect the equator with
            one of the two meridians and get the cyan or magenta geodesics and
            vertices,
            which are not the same as the yellow ones.
            (In a flat triangle the three vertex families would coincide.)
          </p>
          <p>
            In contrast, my triangulation treats
            the three coordinate axes and thus
            the three directions of the spherical triangle equally.
            Check the "wireframe" and "useSinesCap" toggles to see it.
            See <a href="https://github.com/hcschuetz/graphics-sketchbook/doc/octasphere.md">here</a> for a description.
          </p>
          <p>
            Notice that if the resolution is a multiple of 3,
            the central point of the octahedron face at
            {} <em>(1/3, 1/3, 1/3)</em> is one of the auxiliary vertices.
            My approach (and even the straight-forward normalization
            of vertices from the octahedron face,
            which you get by unchecking "useSinesCap" in the config box)
            maps it to the center of the spheric triangle
            whereas the geodesic approaches don't.
          </p>
        </div>
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
