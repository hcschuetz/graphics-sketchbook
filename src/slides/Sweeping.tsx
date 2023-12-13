import { FC, PointerEventHandler, useEffect, useRef, useState } from "react"
import { Slide } from "../SlideShow"
import { addP, Animation, diffP, distanceP, Dot, dotProduct, interpolate, Line, scaleP, subdivide, TAU, XYPoint } from "../utils/lib"


const myAudioContext = new AudioContext();

function beep(duration = 0.2, frequency = 440, volume = 100){
  return new Promise<void>((resolve, reject) => {
    try {
      const oscillatorNode = myAudioContext.createOscillator();
      oscillatorNode.frequency.value = frequency;
      oscillatorNode.type= "square";

      const gainNode = myAudioContext.createGain();
      gainNode.gain.value = volume * 0.01;

      oscillatorNode.connect(gainNode);
      gainNode.connect(myAudioContext.destination);

      oscillatorNode.start(myAudioContext.currentTime);
      oscillatorNode.stop(myAudioContext.currentTime + duration);
      oscillatorNode.onended = () => resolve();
    } catch(error) {
      reject(error);
    }
  });
}

const BeepingDot: FC<Parameters<typeof Dot>[0] & {fill: string}> = props => {
  const oldFill = useRef<string>();
  const {fill} = props;
  useEffect(() => {
    if (oldFill.current && fill !== oldFill.current) {
      beep(0.05, fill > oldFill.current ? 440 : 880);
    }
    oldFill.current = fill;
  }, [fill]);
  return <Dot {...props}/>;
};

export const Sweeping: FC = () => {
  const [center, setCenter] = useState<XYPoint>();
  const [radius, setRadius] = useState(0);

  const wiperCenter = {x: 0, y: -5};
  const [wiperAngle, setWiperAngle] = useState(TAU / 2);

  const [dots] = useState(() => subdivide(0, 49, 49).map(() => ({
    x: (Math.random() - 0.5) * 16,
    y: (Math.random() - 0.5) * 9,
  })));

  const sweep: PointerEventHandler<SVGSVGElement> = evt => {
    const center = 
      new DOMPointReadOnly(evt.clientX, evt.clientY)
      .matrixTransform(
        // - Why is the cast of evt.target needed?
        // - Why do we have to apply .getScreenCTM() to .clientX and .clientY?
        //                               ^^^^^^          ^^^^^^       ^^^^^^
        (evt.target as SVGGraphicsElement).getScreenCTM()?.inverse()
      );

    async function sweep() {
      let center = 
        new DOMPointReadOnly(evt.clientX, evt.clientY)
        .matrixTransform(
          // - Why is the cast of evt.target needed?
          // - Why do we have to apply .getScreenCTM() to .clientX and .clientY?
          //                               ^^^^^^          ^^^^^^       ^^^^^^
          (evt.target as SVGGraphicsElement).getScreenCTM()?.inverse()
        );
      setCenter(center);
      setRadius(0);

      const a = new Animation();
      await a.animate(3, lambda => setRadius(lambda * 15));
      await a.animate(3, lambda => setWiperAngle(interpolate(TAU / 2, 0, lambda)));
      setCenter(undefined);
      setRadius(0);
      setWiperAngle(TAU / 2);
    }
    sweep();
  }

  function dotActive(dot: XYPoint): boolean {
    if (!center) return false;
    const inCircle = distanceP(dot, center) < radius;
    const wiperNormal = {
      x: Math.cos(wiperAngle - TAU/4),
      y: Math.sin(wiperAngle - TAU/4),
    };
    const beforeWiper = dotProduct(wiperNormal, diffP(dot, wiperCenter)) > 0;
    return inCircle === beforeWiper;
  }
  return (
    <Slide>
      <div style={{position: "absolute", left: 30, top: 0, fontSize: 24}}>
        <h2>Sweeping Demo</h2>
        Click anywhere and wait a few seconds.
      </div>

      <svg
        viewBox="-8, -4.5, 16, 9" style={{width: "100vw", height: "100vh"}}
        transform="scale(1, -1)"
        fill="rgb(0 0 0 / 0)" strokeWidth={0.01} stroke="white"
        onPointerDown={sweep}
      >
        {dots.map((dot, i) => (
          <BeepingDot key={i} center={dot} radius={0.03}
            strokeWidth={0} fill={dotActive(dot)? "magenta" : "white"}
          />
        ))}
        {center && radius && (
          <circle cx={center.x} cy={center.y} r={radius} stroke="yellow"/>
        )}
        <Line
          p1={wiperCenter}
          p2={addP(wiperCenter, scaleP(20, {x: Math.cos(wiperAngle), y: Math.sin(wiperAngle)}))}
          stroke="yellow"
        />
      </svg>
    </Slide>
  )
}