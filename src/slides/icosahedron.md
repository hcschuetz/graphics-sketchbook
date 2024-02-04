Icosahedron Geometry #3
-----------------------

Find coordinates for a regular icosahedron
- centered at the origin
- with one face in the `z = 1` plane
- with one vertex `C` of that face in the `x/z` plane, i.e., `C = (u, 0, 1)`
  with some (currently unknown) value `u`.

We choose `u` to be positive.

Actually `u` is the circumradius of a face.  Since faces are regular triangles,
the inradius is `1/2 u` and the height is `3/2 u`.
The edge length is `sqrt(3) u`.

The face opposite to the face mentioned above is in the `z = -1` plane
and it has one edge whose center `M` is on the `x/z` plane.
It is one face inradius away in the positive `x` direction
from the face center `(0, 0, -1)`, i.e., `M = (u/2, 0, -1)`.

Let `P := (x, y, z)` be the vertex with the highest `x` coordinate value.
For symmetry reasons we have `y = 0`. So we have `P = (x, 0, z)`.

The following equations hold in a regular icosahedron:
```
(x - u)^2 + (1 - z)^2 = 3 u^2        // |CP| is the edge length.
(x - u/2)^2 + (z + 1)^2 = (3/2 u)^2  // |MP| is the face height.
x^2 + z^2 = u^2 + 1^2                // P and C have the same distance from the
                                     // icosahedron center, i.e., the origin
```
This system of 3 quadratic equations with 3 unknown variables `u`, `x`, and `z`
has four solutions.  One of them fits with our geometry:
```
u = 3 - sqrt(5)
x = sqrt(5) - 1
z = 2 - sqrt(5)
```
