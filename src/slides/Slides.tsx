import { FC } from 'react';
import { Leva } from 'leva';
import { Slide, SlideShow } from '../SlideShow';

import { NewtonIteration } from './NewtonIteration';
import { Spiral } from './Spiral';
import { Sweeping } from './Sweeping';
import { BezierDemo } from './Bezier';
import { Title } from '../utils/Title';
import { DyckPaths } from './Dyck';
import { IcosahedronSlide } from './icosahedron';
import { BunnySlide } from './bunny/bunny';
import { TeapotSlide } from './newell_teaset/teapot';
import { EnneperSurfaceSlide } from './EnneperSurface';
import { SoapSlide } from './soap';
import { BuzzerSlide } from './BuzzerSlide';

const Slides: FC = () => (<>
  <Title>Graphics Sketchbook</Title>
  <Leva collapsed/>
  <SlideShow>
  <Slide style={{padding: 50, fontSize: 24}}>
      <div>
        <h1>Graphics Sketchbook</h1>
        <div style={{fontSize: "170%", marginBottom: "3em"}}>Heribert Schütz</div>
        <ul>
          <li>
            Use the left/right arrow keys to navigate between the slides.
            <br />
            (With the control key to jump to the beginning/end.)
            <br />
            Or use the "slide#" control in the config box in the top-right corner.
            (Open with the triangle handle.)
          </li>
          <li>
            Switch to full-screen mode using the toggle in the config box.
          </li>
          <li>
            Use the mouse and the 3 mouse buttons to rotate/zoom/move
            the 3D objects.
          </li>
          <li>
            Play with the parameters in the config box.
          </li>
        </ul>
      </div>
    </Slide>
    <Slide style={{padding: 50, fontSize: 24}}>
      <div>
        <h1>Standard Shapes</h1>
      </div>
    </Slide>
    <BunnySlide/>
    <TeapotSlide/>
    <IcosahedronSlide/>
    <BuzzerSlide/>
    <SoapSlide/>
    <EnneperSurfaceSlide/>
    <BezierDemo/>

    <Slide style={{padding: 50, fontSize: 24}}>
      <div>
        <h1>Ported Manim Examples</h1>
        <p>
          from <a href="https://www.youtube.com/playlist?list=PLsMrDyoG1sZm6-jIUQCgN3BVyEVOZz3LQ">
            Benjamin Hackl's Manim Intro
          </a>.
        </p>
      </div>
    </Slide>
    <NewtonIteration/>
    <Sweeping/>
    <DyckPaths/>
    <Spiral/>
  </SlideShow>
</>);

export default Slides;
