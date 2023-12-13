import { useControls } from "leva";
import { FC, SVGProps, useEffect, useRef } from "react";

// TODO choose a different name to avoid confusion with the built-in Animation
export class Animation {
  running = false;
  timeScale = 1000;

  constructor() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  sleep(duration: number) {
    return new Promise<void>((resolve, reject) => setTimeout(
      () => this.running ? resolve() : reject("stopped (sleeping)"),
      duration * this.timeScale,
    ));
  }

  nextFrame() {
    return new Promise<number>((resolve, reject) => requestAnimationFrame(
      t => this.running ? resolve(t) : reject("stopped (animating)")
    ));
  }

  async animate(
    duration: number,
    callback: (lambda: number) => void
  ): Promise<void> {

    const duration_ms = duration * this.timeScale;
    const t0 = performance.now();
    const t1 = t0 + duration_ms;

    // No `callback(0)` as we assume that this is anyway the current status.
    for (;;) {
      // Flooring with t0 to avoid negative callback argument ("lambda").
      // (Why does `requestAnimationFrame` provide a timestamp less than `t0`?)
      const t = Math.max(await this.nextFrame(), t0);
      if (t >= t1)
        break;
      callback((t - t0) / duration_ms);
    }
    callback(1);
  }
}

class ImmediateAnimation extends Animation {
  sleep(duration: number) {
    return Promise.resolve();
  }
  nextFrame(): Promise<number> {
    return Promise.resolve(performance.now());
  }
}

export const immediateAnimation = new ImmediateAnimation();

export const TAU = 2 * Math.PI;

export const interpolate = (a: number, b: number, lambda: number): number => a * (1 - lambda) + b * lambda;

export const interpolateP = (a: XYPoint, b: XYPoint, lambda: number): XYPoint => ({
  x: interpolate(a.x, b.x, lambda),
  y: interpolate(a.y, b.y, lambda),
});

export function subdivide(from: number, to: number, nSteps: number): number[] {
  if (nSteps === 0) {
    if (from !== to) {
      console.warn("Subdividing a non-empty interval into 0 steps", from, to, nSteps);
    }
    return [from];
  }
  const out = [];
  for (let i = 0, j = nSteps; j >= 0; i++, j--) {
    out.push((from * j + to * i) / nSteps);
  }
  return out;
}

export type XYPoint = { readonly x: number; readonly y: number; };

export const scaleP = (lambda: number, p: XYPoint): XYPoint => ({x: lambda * p.x, y: lambda * p.y});
export const addP = (a: XYPoint, b: XYPoint): XYPoint => ({x: a.x + b.x, y: a.y + b.y});
export const diffP = (a: XYPoint, b: XYPoint): XYPoint => ({x: a.x - b.x, y: a.y - b.y});
export const distanceP = (a: XYPoint, b: XYPoint): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
export const dotProduct = (a: XYPoint, b: XYPoint): number => a.x*b.x + a.y*b.y;
export const normSquare = (a: XYPoint): number => dotProduct(a, a);
export const norm = (a: XYPoint): number => Math.sqrt(normSquare(a));
export const normalize = (a: XYPoint): XYPoint => scaleP(1/norm(a), a);
export const rotPos90 = ({x, y}: XYPoint): XYPoint => ({x: -y, y:  x});
export const rotNeg90 = ({x, y}: XYPoint): XYPoint => ({x:  y, y: -x});

export type Func = (x: number) => number;

export const derivative = (f: Func, dx: number): Func =>
  x => (f(x + dx) - f(x - dx)) / (2 * dx);

export const Dot: FC<
  { center: XYPoint; radius?: number; } &
  Omit<SVGProps<SVGCircleElement>, "cx" | "cy" | "r">
> = ({ center, radius = 0.05, ...more }) => (
  <circle cx={center.x} cy={center.y} r={radius} {...more} />
);

export const Line: FC<
  { p1: XYPoint; p2: XYPoint; } &
  Omit<SVGProps<SVGLineElement>, "x1" | "x2" | "y1" | "y2">
> = ({ p1, p2, ...more }) => (
  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} {...more} />
);

export const ParametricLine: FC<
  {
    from: number; to: number; step: number;
    funcX: Func; funcY: Func;
    closed?: boolean;
  } &
  Omit<SVGProps<SVGPolylineElement>, "points">
> = ({
  from, to, step, funcX, funcY, closed = false, ...more
}) => {
    const {
      attributeBased, fullReplace,
    } = useControls("feature flags", {
      attributeBased: true,
      fullReplace: { value: true, render: (get) => !get("feature flags.attributeBased") },
    });

    const ref = useRef<SVGPolylineElement>(null);

    const steps = subdivide(from, to, Math.ceil((to - from) / step));

    useEffect(() => {
      if (attributeBased)
        return;
      const { current } = ref;
      if (current) {
        const { points } = current;
        let i = 0;
        if (fullReplace) {
          points.clear();
        } else {
          // not clear if the complexity of this variant is worthwhile
          const updateTo = Math.min(points.length, steps.length);
          for (; i < updateTo; i++) {
            const t = steps[i];
            const cp = points[i];
            // console.log("point=", i, cp, t);
            cp.x = funcX(t);
            cp.y = funcY(t);
          }
          while (points.length > i) {
            // console.log("point=", i, points.length - 1);
            points.removeItem(points.length - 1);
          }
        }
        const svg = current.closest("svg")!;
        for (; i < steps.length; i++) {
          const t = steps[i];
          const cp = svg.createSVGPoint();
          cp.x = funcX(t);
          cp.y = funcY(t);
          // console.log("point+", i, cp, t);
          points.appendItem(cp);
        }
      }
    }, [attributeBased, ref.current, steps, funcX, funcY]);

    let points: string | undefined = attributeBased
      ? steps
        .map(t => `${funcX(t)},${funcY(t)}`)
        .join(" ")
      : undefined;
    return (closed
      ? <polygon ref={ref} points={points} {...more} />
      : <polyline ref={ref} points={points} {...more} />
    );
  };

// TODO Should `Polyline` be the primitive and `ParametricLine` based on it?
export const Polyline: FC<
  { points: XYPoint[]; } &
  Omit<Parameters<typeof ParametricLine>[0], "from" | "to" | "step" | "funcX" | "funcY">
> = ({ points, ...more }) => (
  <ParametricLine from={0} to={points.length - 1} step={1}
    funcX={i => points[i].x}
    funcY={i => points[i].y}
    {...more}  
  />
);

export const identity = <T,>(x: T): T => x;

export const FunctionGraph: FC<
  {func: Func;} &
  Omit<Parameters<typeof ParametricLine>[0], "funcX" | "funcY">
> = ({func, ...more }) => (
  console.log("FG:", func, more),
  <ParametricLine funcX={identity} funcY={func} {...more} />
  );

const tickSize = 0.06;

export const Axes: FC = () => (<>
  <line x1={-7.5} x2={7.5} />
  <polygon points="7.5,0 7.3,0.1 7.3,-0.1 7.5,0" fill="white" />
  {subdivide(-7, 7, 14).map(x => (
    <line key={x} x1={x} y1={-tickSize} x2={x} y2={tickSize} />
  ))}
  <line y1={-4.2} y2={4.2} />
  <polygon points="0,4.2 0.1,4.0 -0.1, 4.0 0,4.2" fill="white" />
  {subdivide(-4, 4, 8).map(y => (
    <line key={y} x1={-tickSize} y1={y} x2={tickSize} y2={y} />
  ))}
</>);
