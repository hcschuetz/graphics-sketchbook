import { OrbitControls, PresentationControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import { FC } from 'react';
import { DoubleSide, Vector3 } from 'three';
import { Slide } from '../SlideShow';
import { quadrangulate } from '../SurfaceGeometry';
import { subdivide, TAU } from '../utils/lib';


const EnneperSurface : FC = () => {
  const {
    xRange: [xFrom, xTo], yRange: [yFrom, yTo], xSteps, ySteps,
    wireframe,roughness, metalness
  } = useControls("enneper", {
    xRange: {value: [-1, 1], min: -TAU, max: TAU},
    yRange: {value: [-1, 1], min: -TAU, max: TAU},
    xSteps: {value: 50, min: 2, max: 200, step: 1},
    ySteps: {value: 50, min: 2, max: 200, step: 1},
    wireframe: false,
    roughness: {value: 0.6, min: 0, max: 1},
    metalness: {value: 0.6, min: 0, max: 1},
  });
  const xs = subdivide(xFrom, xTo, xSteps);
  const ys = subdivide(yFrom, yTo, ySteps);
  return(<>
    <mesh>
      <surfaceGeometry args={[quadrangulate(xs, ys, (x, y) => new Vector3(
        + x - 1/3 * x**3 + x * y**2,
        - y + 1/3 * y**3 - x**2 * y,
        x**2 - y**2,
      ))]} />
      <meshStandardMaterial side={DoubleSide}
        wireframe={wireframe}
        roughness={roughness} metalness={metalness}
      />
    </mesh>
  </>);
};

export const EnneperSurfaceSlide: FC = () => (
  <Slide>
    <div style={{
      zIndex: 1,
      position: "absolute", left: 30, top: 0, width: "30%", fontSize: 24
    }}>
      <h2>Enneper Surface</h2>

      <p>
        A soap-film-like surface with a closed-form solution.
        So we need no simulation.
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
        <group rotation={[
          // Let the x/y plane appear almost horizontal (like paper on a desk)
          -.9 * TAU / 4,
          0,
          // ...and also a bit away from the y/z plane:
          -.8 * TAU / 8
        ]}>

          <EnneperSurface/>

        </group>
      </PresentationControls>
    </Canvas>
  </Slide>
);
