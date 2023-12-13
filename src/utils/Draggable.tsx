import { FC, memo, PointerEvent, PointerEventHandler, ReactNode, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XYPoint } from "./lib";

export type Movement = {from: XYPoint, to: XYPoint};
export type MotionCallback = (m: Movement) => void;

export const Draggable: FC<{
  onStart?: MotionCallback; onMove?: MotionCallback; onEnd?: MotionCallback;
  children: ReactNode;
}> = memo(({ onStart, onMove, onEnd, children }) => {
  const [movement, setMovement] = useState<Movement>();

  const gRef = useRef<SVGGElement>(null);

  const pointAtPointer = (event: PointerEvent<Element>): XYPoint =>
    new DOMPointReadOnly(event.clientX, event.clientY)
      .matrixTransform(gRef.current!.getScreenCTM()!.inverse());
  
  const dragStart: PointerEventHandler<Element> = event => {
    event.preventDefault();
    event.stopPropagation();
    const point = pointAtPointer(event);
    const newMovement = {from: point, to: point};
    setMovement(newMovement);
    onStart?.(newMovement);
  };

  const drag: PointerEventHandler<Element> = event => {
    if (movement === undefined)
      return;
    event.preventDefault();
    event.stopPropagation();

    const newMovement = {from: movement.from, to: pointAtPointer(event)};
    if (!event.buttons) {
      setMovement(undefined);
      onEnd?.(newMovement);
    } else {
      setMovement(newMovement);
      onMove?.(newMovement);
    }
  };

  return (
    <g ref={gRef} onPointerDown={dragStart}>
      {children}
      {movement !== undefined && <>
        {createPortal((
          // "glass pane"
          <div onPointerMove={drag} onPointerUp={drag} onPointerEnter={drag}
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
              background: "#00000000",
            }}
          />),
          document.body
        )}
      </>}
    </g>
  );
});
