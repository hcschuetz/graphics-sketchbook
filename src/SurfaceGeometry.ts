import { BufferGeometryNode, extend } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { TAU } from "./utils/lib";

type SurfaceOptions = {
  materialIndex?: number;
  invert?: boolean;
};

type SurfaceGeneratorArgs = {
  addVertex: (vec: Vector3, options?: {normal?: Vector3}) => number,
  vertexVector: (i: number) => Vector3,
  normalVector: (i: number) => Vector3,
  addTriangle: (a: number, b: number, c: number, options?: SurfaceOptions) => void,
  // just for convenience:
  addQuadrangle: (a: number, b: number, c: number, d: number, options?: SurfaceOptions) => void,
};

/**
 * A `SurfaceGenerator` is a callback that users of a `SurfaceGeometry` have
 * to pass in as a constructor argument.
 * The `SurfaceGenerator` itself gets three *named* callback arguments
 * which it can use to describe the surface:
 * - `addVertex(v: THREE.Vector3, options?: {normal?: THREE.Vector3}): number`<br>
 *   registers a vector as a vertex and returns its index.
 *   You can provide a normal vector.  If normal vectors have been provided
 *   *for all vertices*,
 *   these normals will be used instead of ones computed from the triangles.
 * - `vertexVector(a: number): THREE.Vector3`<br>
 *   returns the vector registered as the vertex with the given index.
 * - `normalVector(a: number): THREE.Vector3`<br>
 *   returns the vector registered as the normal with the given index.
 * - `addTriangle(a: number, b: number, c: number, options?: {...}): void`<br>
 *   registers a triangle where `a`, `b`, and `c` must be vertex indices.
 * - `addQuadrangle(a: number, b: number, c: number, d: number, options?: {...}): void`<br>
 *   registers two triangles forming a quadrangle.
 *   Again the parameters must be vertex indices.
 * 
 * The optional `options` parameter of `addTriangle` and `addQuadrangle`
 * supports the following optional members:
 * - `invert: boolean = false`<br>
 *   flips the rotation order (and thus the visible side) of the emitted triangles
 * - `materialIndex: number = 0`<br>
 *   selects a material from a material array
 */
export
type SurfaceGenerator = (args: SurfaceGeneratorArgs) => void;

class SurfaceGeometry extends BufferGeometry {
  constructor(surfaceGenerator: SurfaceGenerator) {
    super();

    const vertices: Vector3[] = [];
    const normals: Vector3[] = [];
    const addVertex: SurfaceGeneratorArgs["addVertex"] = (v, {normal} = {}): number => {
      if (normal) {
        if (vertices.length > 0 && normals.length === 0) {
          console.warn(`unexpected normal for vertex #${vertices.length} (${v.toArray()}): ${normal.toArray()}`)
        }
        normals.push(normal);
      } else {
        if (normals.length > 0) {
          console.warn(`expected normal for vertex #${vertices.length} (${v.toArray()})`)
        }
      }
      return vertices.push(v) - 1;
    };
    const vertexVector = (i: number) => vertices[i];
    const normalVector = (i: number) => normals[i];

    // flattened list of vertex indices (3 vertex indices per triangle)
    const trianglesByMaterial: number[][] = [];
    const addTriangle: SurfaceGeneratorArgs["addTriangle"] =
    (a, b, c, {materialIndex = 0, invert = false} = {}): void => {
      const triangles =
        trianglesByMaterial[materialIndex] ||
        (trianglesByMaterial[materialIndex] = []);
      if (invert) triangles.push(c, b, a); else triangles.push(a, b, c);
    };

    const addQuadrangle: SurfaceGeneratorArgs["addQuadrangle"] =
    (a, b, c, d, options) => {
      addTriangle(a, b, c, options);
      addTriangle(a, c, d, options);
    }

    surfaceGenerator({addVertex, vertexVector, normalVector, addTriangle, addQuadrangle});

    // console.log("surface", a, b, vertices, triangles)
    this.setIndex(trianglesByMaterial.flat());
    let groupStartIndex = 0;
    trianglesByMaterial.forEach((triangles, i) => {
      this.addGroup(groupStartIndex, triangles.length, i);
      groupStartIndex += triangles.length;
    });

    // TODO Must buffer attributes be disposed (explicitly)?
    this.setAttribute("position", new Float32BufferAttribute(vertices.flatMap(v => v.toArray()), 3));
    if (normals.length === vertices.length) {
      this.setAttribute("normal", new Float32BufferAttribute(normals.flatMap(n => n.toArray()), 3));
    } else {
      if (normals.length !== 0) {
        console.warn(`Supplied only ${normals.length} normals for ${vertices.length} vertices`);
      }
      this.computeVertexNormals(); // needed by MeshStandardMaterial
    }
  }
}

// Make `<surfaceGeometry/>` known to React Three Fiber and to TypeScript:
extend({ SurfaceGeometry });
declare module '@react-three/fiber' {
  interface ThreeElements {
    surfaceGeometry: BufferGeometryNode<SurfaceGeometry, typeof SurfaceGeometry>;
  }
}

type VertexFromXY = (x: number, y: number) =>
  (Vector3 | Parameters<SurfaceGeneratorArgs["addVertex"]>);

/**
 * A helper generating a surface from a rectangular grid.
 * The grid is described by two lists of coordinate values.
 * `toVertexPos` should map a grid point to a `Vector3` or to an array of
 * arguments for `addVertex`.
 * 
 * Notice that a `SurfaceGeometry` with a `SurfaceGenerator` created by
 * `quadrangulate(...)` is conceptually similar to a `THREE.ParametricGeometry`.
 */
export const quadrangulate =
  (xs: number[], ys: number[], toVertexPos: VertexFromXY): SurfaceGenerator =>
  ({addVertex, addQuadrangle}) =>
{
  // console.log(`quadrangulate ${xs.length} x ${ys.length}, ${toVertex.name || "(anonymous)"}`);
  let prevLine: number[] | undefined = undefined;
  xs.forEach(x => {
    let prevVertex: number | undefined;
    prevLine = ys.map((y, j) => {
      const pos = toVertexPos(x, y);
      const vertex = pos instanceof Vector3 ? addVertex(pos) : addVertex(...pos);
      if (prevLine !== undefined && prevVertex !== undefined) {
        addQuadrangle(prevVertex, vertex, prevLine[j], prevLine[j - 1]);
      }
      return prevVertex = vertex;
    });
  });
};


const directions = {
  x: 0,
  y: 1,
  z: 2,
}

/**
 * A helper generating a surface from a triangle.
 *
 * TODO explain in more detail
 */
export function triangulate(
  n: number,
  {addVertexFromIndices, emitTriangle}: {
    addVertexFromIndices: (i: number, j: number, k: number) => number,
    emitTriangle: (a: number, b: number, c: number, is: number, js: number, ks: number) => void,
  }
): void {
  let prevRow: number[] | undefined;
  for (let i = 0; i <= n; i++) {
    const currentRow: number[] = [];
    const n_i = n-i;
    let prev: number | undefined;
    for (let j = 0; j <= n_i; j++) {
      const k = n_i - j;
      const v = addVertexFromIndices(i, j, k);
      currentRow.push(v);
      if (prevRow) {
        if (prev) {
          emitTriangle(v, prevRow[j], prev, 3*i-1, 3*j-1, 3*k+2);
        } 
        emitTriangle(v, prevRow[j+1], prevRow[j], 3*i-2, 3*j+1, 3*k+1);
      }
      prev = v;
    }
    prevRow = currentRow;
  }
}

export const combineSurfaceGenerators =
  (...gs: SurfaceGenerator[]): SurfaceGenerator =>
  (args: SurfaceGeneratorArgs): void =>
{
  for (const g of gs) {
    g(args);
  }
};


export const roundedBoxSurfaceGenerator = (
  corner0: Vector3,
  corner1: Vector3,
  radii: Vector3,
  nSteps: number,
): SurfaceGenerator => {
  const corner01 = [corner0, corner1];

  const sines: number[] = [];
  for (let m = 0; m <= nSteps; m++)
    sines.push(Math.sin(m/nSteps * TAU/4));

  return ({ addVertex, addTriangle, addQuadrangle }) => {

    // During the construction of the eight rounded corners (each of which is a
    // spherical triangle) we collect the vertices along the borders of these
    // triangles.  Each vertex is indexed by a value saying
    // - which corner the vertex belongs to (`dims`) and
    // - where it is located within that corner (`dims2`).
    //
    // Later these vertices are re-used for the quadrangles forming the faces
    // and the rounded edges.
    const vertexMap: Record<string, number> = {};
    const vertexKey = (dims: number[], dims2: number[]) => `${dims}/${dims2}`;

    corner01.forEach(({x}, i) =>
      corner01.forEach(({y}, j) =>
        corner01.forEach(({z}, k) => {
          const invert = (i + j + k) % 2 === 0;
          const signs = new Vector3(i, j, k).clone().multiplyScalar(2).subScalar(1);
          const corner = new Vector3(x, y, z);
          // corner:
          triangulate(nSteps, {
            addVertexFromIndices: (i2, j2, k2) => {
              // TODO A caller-provided function should compute the normal and
              // the position vector based on i, j, k, i2, j2, and k2.
              // The code here would essentially just provide the mesh structure.
              const normal =
                new Vector3(sines[i2], sines[j2], sines[k2])
                .multiply(signs)
                .normalize();
              const vec = normal.clone().multiply(radii).add(corner);
              const v = addVertex(vec, {normal});
              if (i2 === 0 || j2 === 0 || k2 === 0) {
                vertexMap[vertexKey([i, j, k], [i2, j2, k2])] = v;
              }
              return v;
            },
            emitTriangle: (a, b, c) => addTriangle(a, b, c, {invert}),
          });
        })
      )
    );

    const makeQuadrangle = (
      fn: (s: number, t: number) => number,
      options?: SurfaceOptions,
    ): void => addQuadrangle(fn(0, 0), fn(1, 0), fn(1, 1), fn(0, 1), options);
    
    for (let axis = 0; axis < 3; axis++) {
      const lookup = (dims: [number, number, number], dims2: [number, number, number]) =>
        vertexMap[vertexKey(rotate(axis, dims), rotate(axis, dims2))];

      [0, 1].forEach(f => {
        const invert = f === 0;
        // face
        makeQuadrangle((s, t) => lookup([f, s, t], [nSteps, 0, 0]), {invert});

        [0, 1].forEach(g => {
          const invert = f !== g;
          // edge
          for (let f2 = 0; f2 < nSteps; f2++) {
            const g2 = nSteps - f2;
            makeQuadrangle((s, t) => lookup([s, f, g], [0, f2 + t, g2 - t]), {invert});
          }
        });
      })
    };
  };
};

const rotate = <T>(i: number, a: T[]) => [...a.slice(i), ...a.slice(0, i)];
