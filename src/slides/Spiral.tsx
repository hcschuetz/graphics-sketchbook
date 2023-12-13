import { Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { FC } from "react";
import { Slide } from "../SlideShow";
import { subdivide } from "../utils/lib";


const TAU = 2 * Math.PI;

export const Spiral: FC = () => {

  return (
    <Slide>
      <div style={{position: "absolute", left: 30, top: 0, fontSize: 24}}>
        <h2>Minimalistic Spiral Demo</h2>
        <p>
          Rotate/zoom/move the scene using the left/middle/right mouse button.
        </p>
        <p>
          Try to convert the circle into a sine or cosine function
          by looking at the spiral from different angles.
        </p>
      </div>

      <Canvas>
        <OrthographicCamera makeDefault
          top={9} bottom={-9} left={-16} right={16} near={.1} far={1000}
          zoom={1} position={[0, 0, 10]}
        />
        <OrbitControls/>
        <group>
          <Line color="white" points={[[-2, 0, 0], [2, 0, 0]]}/>
          <Line color="white" points={[[0, -2, 0], [0, 2, 0]]}/>
          <Line color="white" points={[[0, 0, -1], [0, 0, 2 * TAU + 1]]}/>
        </group>
        <Line color="white" points={
          subdivide(0, 2 * TAU, 500).map(t => [Math.cos(t), Math.sin(t), t])
        }/>
      </Canvas>
    </Slide>
  );
}