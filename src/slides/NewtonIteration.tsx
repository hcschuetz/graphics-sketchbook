import { useControls } from "leva";
import { FC, PointerEventHandler, useLayoutEffect, useRef, useState } from "react";
import { Slide } from "../SlideShow";
import { Func, derivative, Animation, interpolate, interpolateP, Axes, FunctionGraph, Dot, Line, distanceP } from "../utils/lib";

const fns: Func[] = [
  x => (x+6) * (x+3) * x * (x-3) * (x-6) / 300,
  x => x*x/2 - 1,
  x => x*x/2 + 1, // no roots!
  x => Math.sin(x/2)*3,
  x => Math.sin(x/2)*3 + Math.cos(x*3)*1.5,
];

/**
 * A React/SVG-based re-implementation of https://youtu.be/KeXBLPC1tns?t=2692
 */
export const NewtonIteration: FC = () => {
  const { fnIndex } = useControls("newton", {
    fnIndex: {label: "fn#", value: 0, min: 0, max: fns.length - 1, step: 1},
  });

  const [fn, setFn] = useState<Func | undefined>();
  const fn1 = fn && derivative(fn, 0.01);

  const [fnScale, setFnScale] = useState(1);

  const [dot, setDot] = useState(() => ({x: 0, y: 0}));
  const [dotColor, setDotColor] = useState("yellow");

  const [tangentOpacity, setTangentOpacity] = useState(0);
  const [p0, setP0] = useState(() => new DOMPointReadOnly());
  const [p1, setP1] = useState(() => new DOMPointReadOnly(1));

  const animation = useRef<Animation | undefined>();

  useLayoutEffect(() => {
    async function animateFn() {
      const a = new Animation();
      const newFn = fns[fnIndex];
      if (fn) {
        await a.animate(0.7, lambda =>
          setFn(() => (x: number) => interpolate(fn(x), newFn(x), lambda))
        );
        setFn(() => newFn);
      } else {
        setFn(() => newFn);
        setFnScale(0);
        await a.animate(0.7, setFnScale);
      }
    }
    animateFn();
  }, [fnIndex]);

  const iterate: PointerEventHandler<SVGGraphicsElement> = async evt => {
    try {
      if (!fn) return;
      animation.current?.stop(); // stop any possibly running other animation
      const a = new Animation();
      animation.current = a; // so that this animation can be stopped from elsewhere

      setTangentOpacity(0);
      setDotColor("yellow");
      let dot = 
        new DOMPointReadOnly(evt.clientX, evt.clientY)
        .matrixTransform(
          // - Why is the cast of evt.target needed?
          // - Why do we have to apply .getScreenCTM() to .clientX and .clientY?
          //                               ^^^^^^          ^^^^^^       ^^^^^^
          (evt.target as SVGGraphicsElement).getScreenCTM()?.inverse()
        );
      for (let i = 0; i < 10; i++) {
        setDot(dot);
        const {x} = dot;
        const p0 = new DOMPointReadOnly(x, fn(x));
        if (Math.abs(p0.y) < 0.5e-3) {
          setDotColor("red");
          break;
        }
        await a.animate(0.5, lambda => setDot(interpolateP(dot, p0, lambda)));
        const xNew = x - fn(x) / fn1!(x);
        const p1 = new DOMPointReadOnly(xNew, 0);
        setP0(p0);
        setP1(p1);
        // await a.sleep(1);
        await a.animate(0.3, lambda => setTangentOpacity(lambda));
        await a.animate(0.6, lambda => setDot(interpolateP(p0, p1, lambda)));
        await a.animate(0.3, lambda => setTangentOpacity(1-lambda));
        dot = p1;
      }
    } catch (e) {
      console.log("exception in newton iteration:", e);
    }
  }

  return (
    <Slide>
      <div style={{position: "absolute", left: 30, top: 0, width: "30%", fontSize: 24}}>
        <h2>Newton Iteration</h2>
        <ul>
          <li>Click somewhere to start a Newton iteration.</li>
          <li>
            Select another function by dragging the "fn#" slider
            in the "newton" section of the config box.
          </li>
          <li>
            Move to another slide and come back here to see the function graph appear.
            (Normally one would only enable one of the effects.)
          </li>
        </ul>
        Debug Output:
        <pre>{`
          dot: ${dot.x.toFixed(3)},${dot.y.toFixed(3)}
          fn: ${fn}
          fnScale: ${fnScale}
        `.trim().split("\n").map(line => line.trim()).join("\n")}</pre>
      </div>
      <svg
        viewBox="-8, -4.5, 16, 9" style={{width: "100vw", height: "100vh"}}
        transform="scale(1, -1)"
        fill="rgb(0 0 0 / 0)" strokeWidth={0.01} stroke="white"
        onPointerDown={iterate}
      >
        <Axes/>
        <FunctionGraph stroke="red" strokeWidth={0.02}
          // so many usages of `fnScale` just for demo purposes:
          opacity={fnScale}
          from={-7 * fnScale} to={7 * fnScale} step={0.02}
          func={x => fnScale * (fn ? fn(x) : 0)}
        />
        <Dot stroke="black" fill={dotColor} center={dot}/>
        <Line stroke="yellow" strokeWidth={0.01}
          style={{opacity: tangentOpacity}}
          // This lets the line reach one unit beyond the two points:
          p1={interpolateP(p0, p1, 0 - 1 / distanceP(p0, p1))}
          p2={interpolateP(p0, p1, 1 + 1 / distanceP(p0, p1))}
        />
      </svg>
    </Slide>
  )
};
