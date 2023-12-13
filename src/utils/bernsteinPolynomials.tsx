import { Polynomial } from "./Polynomial";

/**
 * bernsteinPolynomials(n)[k][i] is
 * - the coefficient for t^i
 * - in the polynomial for p_k
 * - of degree n-1
 *
 * In other words, bernsteinPolynomials(n)[k] is the polynomial for p_k of degree n-1.
 */
export const bernsteinPolynomials = (nPoints: number): Polynomial[] => {
  let B = [[1]];
  for (let n = 1; n < nPoints; n++) {
    const nextB = [];
    for (let k = 0; k <= n; k++) {
      const polynomial = [];
      for (let i = 0; i <= n; i++) {
        polynomial.push(
          (B[k]?.[i - 1] ?? 0) + (B[k - 1]?.[i] ?? 0) - (B[k - 1]?.[i - 1] ?? 0)
        );
      }
      nextB.push(polynomial);
    }
    B = nextB;
  }
  return B;
};
