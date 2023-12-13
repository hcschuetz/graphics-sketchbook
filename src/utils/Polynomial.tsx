/** Polynomials are represented as lists of coefficients with *ascending* indices. */
export type Polynomial = number[];

export const evalPolynomial = (poly: Polynomial, t: number): number => {
  let pow = 1;
  let sum = 0;
  for (const c of poly) {
    sum += c * pow;
    pow *= t;
  };
  return sum;
};

export const derivePoly = (poly: Polynomial): Polynomial =>
  poly.slice(1).map((c, i) => c * (i + 1));
