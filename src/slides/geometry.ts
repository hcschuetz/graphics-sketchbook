import { diffP, normSquare, scaleP, XYPoint } from "../utils/lib";

export function circumcenter(a: XYPoint, b: XYPoint, c: XYPoint): XYPoint {
  const bc = diffP(b, c);
  const ca = diffP(c, a);
  const ab = diffP(a, b);

  const na = normSquare(a);
  const nb = normSquare(b);
  const nc = normSquare(c);

  const d = 2 * (a.x*bc.y + b.x * ca.y + c.x * ab.y);

  return {
    x:  (na*bc.y + nb*ca.y + nc*ab.y) / d,
    y: -(na*bc.x + nb*ca.x + nc*ab.x) / d,
  }
}

export const radialVector = (a: XYPoint, b: XYPoint, c: XYPoint): XYPoint =>
  diffP(b, circumcenter(a, b, c));

export function centrifugal(a: XYPoint, b: XYPoint, c: XYPoint): XYPoint {
  const rVec = radialVector(a, b, c);
  const rSq = normSquare(rVec);
  // If a, b, c are on a line, the circumcenter coordinates and radius are
  // infinite (or maybe NaN).  In that case there is no centrifugal force.
  return Number.isFinite(rSq) ? scaleP(1/rSq, rVec) : {x: 0, y: 0};
}