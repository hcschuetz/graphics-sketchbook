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
        <div style={{fontSize: "50%"}}>
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
            The approach chosen for the buzzer cap treats
            the three coordinate axes and thus
            the three directions of the spherical triangle equally.
            Check the "wireframe" and "useSinesCap" toggles to see the triangulation.
            Rotating the spherical triangle around its center by ±120°
            maps the auxiliary vertices of the red wireframe
            to auxiliary vertices again.
            This is not true for any of the three geodesics-based approaches.
          </p>
          <p>
            How my approach works:
            Consider the triangular face of the unit octahedron in the (+,+,+) octant
            and assume some resolution <em>n ∈ ℕ</em>.
            Then each auxiliary vertex on that face
            has coordinates <em>(x, y, z)</em> such that
            {} <em>x+y+z = 1</em> and <em>x</em>, <em>y</em>, and <em>z</em> are
            integral multiples of <em>1/n</em>.
            (As a side node, "<em>( x : y : z )</em>" are called the "normalized barycentric
            coordinates" in that triangle.)
            Now we first map the vertex
            to <em>(sin(90°·x), sin(90°·y), sin(90°·z))</em> {}
            and then we normalize that vector.
          </p>
          <p>
            This maps the triangle sides (the "main" meridians and the equator)
            to equispaced geodesics:
            <br />
            On each of these lines one of the coordinates <em>x, y, z</em> is zero.
            For example, on the equator <em>z = 0</em> {}
            (if you chose the <em>z</em> axis to point towards a "pole")
            and <em>(x, y, 0) = (x, 1-x, 0)</em> is mapped
            to <em>(sin(90°·x), sin(90°·(1-x)), 0) = (sin(90°·x), cos(90°·x), 0)</em>,
            which is already normalized.
          </p>
          <p>
            But the inner vertices need the normalization step.
          </p>
          <p>
            If the resolution is a multiple of 3, the central point of
            the octahedron face at <em>(1/3, 1/3, 1/3)</em> is one of the
            auxiliary vertices.
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
