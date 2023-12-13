import { useControls } from "leva";
import { FC, Fragment, memo, useMemo, useState } from "react";
import { Slide } from "../SlideShow";
import { Draggable, Movement } from "../utils/Draggable";
import { addP, diffP, Dot, dotProduct, interpolateP, Line, normSquare, Polyline, rotPos90, scaleP, subdivide, TAU, XYPoint } from "../utils/lib";
import { Polynomial, derivePoly, evalPolynomial } from "../utils/Polynomial";
import { bernsteinPolynomials } from "../utils/bernsteinPolynomials";

const schema = {
  nSteps: {value: 50, min: 1, max: 200, step: 1},
  centrifugalFactor: {label: "centrifugal", value: 0, min: -5, max: 5},
  degree: {label: "degree", value: 3, min: 1, max: 10, step: 1},
  lambda: {value: 0.3, min: 0, max: 1},
};

const useBezierControls = () => useControls("bezier", schema);

const evalPolys = (points: XYPoint[], polys: Polynomial[], t: number): XYPoint =>
  weightedSumP(polys.map(poly => evalPolynomial(poly, t)), points);

const weightedSumP = (weights: number[], points: XYPoint[]): XYPoint =>
  points.reduce(
    (acc: XYPoint, p, i) => addP(acc, scaleP(weights[i], p)),
    {x: 0, y: 0},
  );

const BezierSpline: FC<
  {basePoints: XYPoint[]} &
  Omit<Parameters<typeof Polyline>[0], "points">
> = memo(({basePoints, ...more}) => {
  const {nSteps} = useBezierControls();
  const len = basePoints.length;
  const polys = useMemo(() => bernsteinPolynomials(len), [len]);
  const points = subdivide(0, 1, nSteps).map(lambda =>
    evalPolys(basePoints, polys, lambda)
  );

  return (<Polyline points={points} {...more}/>);
});

const Centrifugals: FC<
  {basePoints: XYPoint[]} &
  Omit<Parameters<typeof Line>[0], "p1" | "p2">
> = memo(({basePoints, ...more}) => {
  const {nSteps, centrifugalFactor} = useBezierControls();

  const len = basePoints.length;
  const polys  = useMemo(() => bernsteinPolynomials(len), [len]);
  const polys1 = useMemo(() => polys.map(derivePoly), [polys]);
  const polys2 = useMemo(() => polys1.map(derivePoly), [polys1]);
  
  function line(lambda: number, i: number) {
    const point = evalPolys(basePoints, polys , lambda);
    const speed = evalPolys(basePoints, polys1, lambda);
    const accel = evalPolys(basePoints, polys2, lambda);
    const speedNormal = rotPos90(speed);
    const scale = centrifugalFactor *
      dotProduct(speedNormal, accel) / normSquare(speed)**2;
    const endPoint = diffP(point, scaleP(scale, speedNormal));
    return (<Line key={i} p1={point} p2={endPoint} {...more}/>);
  }

  return (<>{subdivide(0, 1, nSteps).map(line)}</>);
});

const initialPoints =
  subdivide(0, TAU, 10)
  .map(t => ({x: (1 + t/2) * Math.cos(t), y: (1 + t/2) * Math.sin(t)}));

export const BezierDemo: FC = () => {
  const {degree, lambda} = useBezierControls();

  const [basePointsAll, setBasePoints] = useState<XYPoint[]>(initialPoints);
  const basePoints = basePointsAll.slice(0, degree + 1);
  const setBasePoint = (i: number) => ({to}: Movement) =>
    setBasePoints(old => old.map((p, j) => i === j ? to : p))

  const lists: XYPoint[][] = [basePoints];
  let list: XYPoint[] = basePoints;
  while (list.length > 0) {
    const nextList: XYPoint[] = [];
    for (let j = 1; j < list.length; j++) {
      nextList.push(interpolateP(list[j-1], list[j], lambda));
    }
    lists.unshift(nextList);
    list = nextList;
  }

  const colors = [
    ...subdivide(0, degree === 1 ? 0 : 240, degree-1).map(hue =>
      `hsl(${hue}deg 100% 50%)`
    ),
    "white",
  ];

  return (
    <Slide>
      <div style={{position: "absolute", left: 30, top: 0, width: "30%", fontSize: 24}}>
        <h2>Bezier Spline</h2>
        <ul>
          <li>Modify the parameters in the "bezier" section of the config box.</li>
          <li>Drag the (white) primary points.</li>
        </ul>
      </div>
      <svg
        style={{width: "100vw", height: "100vh"}}
        viewBox="-8, -4.5, 16, 9"
        transform="scale(1, -1)"
        fill="rgb(0 0 0 / 0)" strokeWidth={0.02} stroke="white"
      >
        <BezierSpline basePoints={basePoints} stroke={colors[0]}/>
        <Centrifugals basePoints={basePoints} strokeWidth={0.01} opacity={0.5}/>

        {lists.slice(0, -1).flatMap((list, j) => list.map((point, i) => (
          <Fragment key={`${j}/${i}`}>
            <Line p1={lists[j+1][i]} p2={lists[j+1][i+1]} stroke={colors[j]}/>
            <Dot center={point} strokeWidth={0} fill={colors[j-1]} />
          </Fragment>
        )))}

        {basePoints.map((point, i) => (
          <Draggable key={i} onMove={setBasePoint(i)}>
            <Dot center={point} strokeWidth={0} fill="white"/>
          </Draggable>
        ))}
      </svg>
    </Slide>
  )
}

const xyString = ({x, y}: XYPoint) => `(${x.toFixed(3)}, ${y.toFixed(3)})`;
