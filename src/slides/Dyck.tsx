import { button, useControls } from "leva";
import { FC, memo, useRef, useState } from "react";
import { Slide } from "../SlideShow";
import { addP, Animation, Dot, interpolateP, Polyline, XYPoint } from "../utils/lib";


// We represent a Dyck path as a string of balanced parentheses "(" and ")".

function* genCompletions(
  prefix: string, depth: number, remaining: number
): Generator<string> {
  if (depth < 0 || depth > remaining) {
    return;
  }
  if (remaining === 0) {
    yield prefix;
    return;
  }
  yield* genCompletions(prefix + "(", depth + 1, remaining - 1);
  yield* genCompletions(prefix + ")", depth - 1, remaining - 1);
}

function* genPaths(degree: number): Generator<string> {
  yield* genCompletions("", 0, 2 * degree);
}

type Paren = "(" | ")";

const theOtherParen: Record<Paren, Paren> = {
  "(": ")",
  ")": "(",
}

const mirrorPath = (path: string): string =>
  path.split("").reverse().map(c => theOtherParen[c as Paren]).join("");

const isSymmetric = (path: string): boolean => mirrorPath(path) === path;

function pathToPoints(
  path: string,
  {p0 = {x: 0, y: 0}, open = {x: 1, y: 0}, close = {x: 0, y: 1}}
  : {p0?: XYPoint, open?: XYPoint, close?: XYPoint} = {},
): XYPoint[] {
  const offsets = {"(": open, ")": close};
  const points: XYPoint[] = [];
  let point: XYPoint;
  points.push(point = p0);
  for (const c of path) {
    points.push(point = addP(point, offsets[c as Paren]));
  }
  return points;
}

export const DyckPaths: FC = () => {
  const {degree, timeStep, hideText} = useControls("dyck", {
    degree: {value: 7, min: 0, max: 10, step: 1},
    run: button(runAnimation),
    timeStep: {label: "step duration", value: 0.2, min: 0, max: 1},
    hideText: {label: "hide text", value: false},
  });

  const [points, setPoints] = useState<XYPoint[]>([]);
  const [collection, setCollection] = useState<string[]>([]);
  
  // dynamically scoped variables for use in runAnimation():
  const animationRef = useRef<Animation | undefined>();
  const degreeRef = useRef(0); degreeRef.current = degree;
  const timeStepRef = useRef(0); timeStepRef.current = timeStep;

  async function runAnimation() {
    animationRef.current?.stop();
    const a = new Animation();
    animationRef.current = a;

    const degree = degreeRef.current;

    const p0 = {x: -7, y: -3.5};
    const step = 7 / Math.max(degree, 1); // avoiding division by zero
    const open  = {x: step, y:  step};
    const close = {x: step, y: -step};

    setCollection([]);
    let points: XYPoint[] | undefined = undefined;

    for (const newPath of genPaths(degree)) {
      const newPoints = pathToPoints(newPath, {p0, open, close});
      if (!points) { // initial animation
        setPoints(newPoints.slice(0, 1));
        for (let i = 1; i < newPoints.length; i++) {
          const slice = newPoints.slice(0, i);
          const p = newPoints[i-1], q = newPoints[i];
          await a.animate(timeStepRef.current, lambda => {
            setPoints([...slice, interpolateP(p, q, lambda)]);
          });
        }
      } else { // update animation
        await a.animate(timeStepRef.current, lambda =>
          setPoints(points!.map((point, i) =>
            interpolateP(point, newPoints[i], lambda)
          ))
        );
      }
      setCollection(old => [...old, newPath]);
      points = newPoints;
    }
  }

  return (<>
    <div style={{
      position: "absolute", zIndex: 2, left: 30, top: 0, width: "40vw",
      fontSize: 24, display: hideText ? "none" : undefined,
    }}>
      <h2>Dyck Paths</h2>
      A re-implementation of <a href="https://youtu.be/y-3P8r8LKDQ">this</a> {}
      demo.
      <ul>
        <li>Click the "run" button in the config box to start the demo.</li>
        <li>Change step duration (even while the demo is running).</li>
        <li>Change the degree and restart the demo.</li>
        <li>Toggle the highlighting of symmetric paths.</li>
        <li>Hide this text and collapse the config box to access the entire demo
          output.</li>
        <li>Hover the mouse pointer over one of the small collected paths to see
          its text representation.</li>
      </ul>
    </div>
    <Slide>
      <svg
        style={{width: "100vw", height: "100vh"}}
        viewBox="-8, -4.5, 16, 9"
        transform="scale(1, -1)"
        fill="rgb(0 0 0 / 0)" strokeWidth={0.02} stroke="white"
      >
        <Polyline points={points}/>
        {points.map((point, i) => <Dot key={i} center={point} fill="white"/>)}        
        {collection.map((path, i) => (
          <CollectionMember key={path} path={path} index={i}/>
        ))}
      </svg>
    </Slide>
  </>);
};

const CollectionMember: FC<{path: string, index: number}> = memo(({path, index}) => {
  const {highlightSymmetric} = useControls("dyck", {
    highlightSymmetric: {label: "mark symm.", value: true},
  });

  const x = -7.0 + 1/12 + 2/3 *           (index % 21);
  const y =  3.5        - 1/3 * Math.floor(index / 21);
  const step = 1/2 / path.length;
  const points = pathToPoints(path, {
    p0: {x, y},
    open : {x: step, y:  step},
    close: {x: step, y: -step},
  });

  return (<>
    <Polyline
      style={{opacity: highlightSymmetric && isSymmetric(path) ? 1 : 0.3}}
      points={points}
    />
    <rect x={x} y={y} width={1/2} height={1/4} opacity={0}>
      <title /* has no impact: style={{fontSize: 30}} */>{path}</title>
    </rect>
  </>);
});
