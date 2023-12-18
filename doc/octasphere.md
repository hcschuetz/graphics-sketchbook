Sphere Triangulation: The Octasphere
====================================

Heribert Schütz, 2023-12-18

Sphere Triangulation
--------------------

In computer graphics triangle meshes for spheres
are frequently constructed as longitude/latitude grids
with added diagonals in each of the resulting rectangles.
See for example
[here](https://threejs.org/docs/#api/en/geometries/SphereGeometry).

This approach has the advantage that it is easy to understand,
but it also has its disadvantages coming from the fact that the meridians
are much denser near the poles than near the equator:
- Textures are strongly distorted.
- Processing power is wasted for the many small triangles near the poles.
- The degenerate triangles around the poles can cause problems
  for geometric algorithms.

An alternative approach is to take a polyhedron (usually a regular one),
subdivide its faces into triangles, and then project the mesh to the sphere.

A popular choice is to start with a regular icosahedron,
which has various advantages:
- Each face is a regular triangle, which is easy to subdivide regularly
  into smaller triangles.
- A regular icosahedron already comes quite close to its circumscribed sphere
  (at least when compared to the other Platonic solids).
  Therefore a straight-forward central projection
  leads to a relatively small distortion.
- The vertices of an icosahedron have a degree of 5 and are thus close to the
  degree 6 of the auxiliary vertices introduced by the sub-triangulation.
  This is helpful for some geometric algorithms.

Spheres triangulated this way are sometimes called "icospheres".

Sphere triangulations based on a cube are also popular because the square
faces of a cube are easy to work with.

The Octasphere
--------------

Another possible choice is the "octasphere", a sphere triangulation based on
a regular octahedron, which has these advantages:
- As with the icosahedron, the faces are already triangles,
  making a subdivision easy.
- If we only map one of the octahedron faces to the circumscribing sphere,
  we get an eighth of that sphere.
  These eighths of spheres are interesting
  because they occur as the corners of rounded boxes.

Let us start with the "unit octahedron" with its center at `(0, 0, 0)` and the 6
vertices at `(±1, 0, 0)`, `(0, ±1, 0)`, and `(0, 0, ±1)`.
We concentrate on the face with the corners
`(+1, 0, 0)`, `(0, +1, 0)`, and `(0, 0, +1)`,
that is, the face living in the `(+, +, +)` octant.
The other 7 faces can be handled analogously.

We also assume that the sphere is the unit sphere, that is, the sphere around
center `(0, 0, 0)` with radius `1`.
Adapting the following considerations to other spheres is straight-forward.

We choose some positive integer `n` and
sub-triangulate the face regularly in such a way that each edge is
divided into `n` equal segments.
Computationally, the sub-triangle vertices `(x, y, z)`
have the following properties:
- `x`, `y`, and `z` are multiples of `1/n` and between `0` and `1`
  (both included).
- `x + y + z = 1`.

Now we have to map each vertex `(x, y, z)` to the sphere.
A straight-forward approach would be to just normalize the vector to
`(x/len, y/len, z/len)` where `len := sqrt(x^2 + y^2 + z^2)`.
But this approach (actually a central projection) has the disadvantage
that sub-triangles from the center of the face
are enlarged much more than sub-triangles from the corner.
Even along an edge the central segments become longer
than the ones near the ends.

While a mapping between a plane and a sphere will always have some distortion,
we can nevertheless do better.
In particular we can have an undistorted mapping along the edges.
(And we should have equidistant vertices there
so that the "spheric corner" of a rounded box fits
with the three adjacent "cylindric edges".)

Notice that along each edge one of `x`, `y`, or `z` is zero.
Let's consider the case `z = 0`.  The other cases are analogous.
The formula `x + y + z = 1` simplifies to `x + y = 1`
and can be transformed to `y = 1 - x`.
So we have to map the points `(x, 1 - x, 0)` for `x = 0, 1/n, 2/n, ..., 1`
uniformly to the arc on the sphere from `(0, 1, 0)` to `(1, 0, 0)`.
To achieve this, each such point must be mapped to
```
mapping((x, y, 0))
= (sin(90°·x), cos(90°·x), 0)
= (sin(90°·x), sin(90° - 90°·x), 0)
= (sin(90°·x), sin(90°·(1 - x)), 0)
```
Since we had `y = 1 - x`, we can further rewrite this to
```
= (sin(90°·x), sin(90°·y), 0)
```
And since `z = 0` on the current edge, we also have `sin(90°·z) = sin(0°) = 0`.
So we can further rewrite the mapped vertex to
```
= (sin(90°·x), sin(90°·y), sin(90°·z))
```
Exactly the same formula can be derived for the other two edges.

While this does not mean that we must use the same formula also for the inner
vertices (where `x, y, z > 0`), it feels like a natural approach to use it
as well.

Unfortunately for an inner vertex `(x, y, z)` the mapped point
`(sin(90°·x), sin(90°·y), sin(90°·z))` is not normalized,
that is, it is not on the sphere.
(Actually it is inside the sphere, but closer to the sphere than the
initial vertex `(x, y, z)`.)

For example, the central point `(1/3, 1/3, 1/3)` of the face is mapped to
```
  (sin(90°·1/3), sin(90°·1/3), sin(90°·1/3))
= (sin(30°), sin(30°), sin(30°))
= (1/2, 1/2, 1/2)
```
which has a distance of `sqrt(3)/2 ~ 0.866` from the origin.
(Actually this central point is the worst among all the points of the face.)
For comparison, the original point `(1/3, 1/3, 1/3)` has distance
`sqrt(3)/3 ~ 0.577`.

To fix this, we finally add a normalization step.
Notice that this normalization does not affect the edge points,
which have already been mapped to a point on the sphere.
So the equidistance along the boundary arcs is preserved.

Overall, we map a vertex `(x, y, z)` of the sub-triangulated face to:
```
  normalize((sin(90°·x), sin(90°·y), sin(90°·z)))
```

Algorithm
---------

An algorithm for triangulating an eighth of a unit sphere
might look like this in JavaScript,
assuming that a class `Vector3` like the one from Three.js is available:

```js
const RIGHT_ANGLE = Math.PI / 2;
const key = (i, j) => `${i},${j}`;


function triangulateEighthSphere(n, emitTriangle) {
  const positionMap = new Map();
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n - i; j++) {
      const x = i / n;
      const y = j / n;
      const z = (n - i - j) / n;

      const position = new Vector3(
        Math.sin(x * RIGHT_ANGLE),
        Math.sin(y * RIGHT_ANGLE),
        Math.sin(z * RIGHT_ANGLE),
      ).normalize();

      positionMap.set(key(i, j), position);

      if (i > 0) {
        emitTriangle(
          positionMap.get(key(i-1, j)),
          positionMap.get(key(i-1, j+1)),
          position,
        );
        if (j > 0) {
          emitTriangle(
            positionMap.get(key(i-1, j)),
            position,
            positionMap.get(key(i, j-1)),
          );
        }
      }
    }
  }
}

```

Some optimizations are possible, for example:
- The calculations for `x` can be pulled out from the inner loop
  to the outer one.
- The relevant sine values could be pre-computed and
  picked from a table when needed.
- In the triangle generation older positions might be looked up in smarter ways.

For Phong shading we should also attach normals to the vertices.
In our unit-sphere setup the sphere normal
is just the same as the position vector.

Libraries such as Three.js can interpolate vertex normals
from the adjacent faces.
But this can leave visible seams if we assemble multiple
eighths-of-a-sphere without merging corresponding seam vertices.


Visualization
-------------

In my [graphics sketchbook](https://hcschuetz.github.io/graphics-sketchbook/dist/)
look for the slide with the buzzer.
Currently it is slide #6, but this may change.
