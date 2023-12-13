// This code has been written for a particular .ply file
// (the Stanford Bunny) and will not work for arbitrary .ply files.

// The PLY spec actually lists these scalar types:
//
// int8       character                 1
// uint8      unsigned character        1
// int16      short integer             2
// uint16     unsigned short integer    2
// int32      integer                   4
// uint32     unsigned integer          4
// float32    single-precision float    4
// float64    double-precision float    8
//
// But our actual data file uses C-style type names.
// TODO support the specified type names as well.

// TODO support binary PLY files?

// While the spec specifies <cr> as line end, the actual data file uses <lf>.
// We accept <cr>, <lf>, and <cr><lf>.
// This could cause an ambiguity at the end of the header in a binary file:
// In "end_header<cr><lf>" it is not clear if the <lf> is part of the line
// separator or the first data byte.
// But for now we anyway only support ascii files.

// TODO Check calls to parseInt and parseFloat?
// - if they were successful (not returning NaN)
// - if they consumed all characters

type IntType = "uchar" | "int";
type ScalarType = IntType | "float";

type PropDef = { name: string; } & (
  { type: ScalarType; } |
  { type: "list"; lengthType: IntType; elementType: ScalarType; });

type ElementDef = {
  name: string;
  count: number;
  props: PropDef[];
  data: Record<string, any>[];
};

export function parsePly(text: string, name: string): ElementDef[] {
  function fail(reason: string): never {
    throw new Error(`${name}: ${reason}`);
  }

  const lines = text.trim().split(/\r\n?|\n/).map(l => l.trim());
  if (lines.shift() !== "ply") {
    fail("not a ply file");
  }
  const elements: ElementDef[] = [];
  header: for (; ;) {
    const line = lines.shift();
    if (!line) {
      fail("ended unexpectedly");
    }
    const words = line.split(/ +/);
    const cmd = words.shift();
    switch (cmd) {
      case undefined: break; // emit an error?
      case "end_header": break header;
      case "comment": break;
      case "format": {
        if (words[0] !== "ascii" || words[1] !== "1.0") {
          fail("unexpected ply format");
        }
        break;
      }
      case "element": {
        elements.push({
          name: words[0],
          count: Number.parseInt(words[1]),
          props: [],
          data: [],
        });
        break;
      }
      case "property": {
        const element = elements.at(-1);
        if (!element) {
          fail("property decl before element decl");
        }
        const name = words.pop();
        if (!name) {
          fail("incomplete property");
        }
        const type = words.shift();
        switch (type) {
          case undefined: {
            fail("incomplete property");
          }
          case "float":
          case "uchar":
          case "int": {
            element.props.push({ type, name });
            break;
          }
          case "list": {
            const lengthType = words.shift();
            const elementType = words.shift();
            if (!(lengthType === "uchar" || lengthType === "int")) {
              fail("unexpected length type: " + lengthType);
            }
            if (!(elementType === "uchar" || elementType === "int" || elementType === "float")) {
              fail("unexpected element type: " + elementType);
            }
            element.props.push({ type, name, lengthType, elementType });
            break;
          }
          default: fail("unexpected property type: " + type);
        }
        break;
      }
      default: fail("unexpected ply command: " + cmd);
    }
  }
  for (const { count, props, data } of elements) {
    for (let i = 0; i < count; i++) {
      const line = lines.shift();
      if (!line) {
        fail("unexpected end of data");
      }
      const words = line.split(/ +/);
      const elem: Record<string, any> = {};
      for (const prop of props) {
        switch (prop.type) {
          case "list": {
            const len = words.shift();
            if (!len) {
              fail("list length missing");
            }
            const list: number[] = [];
            const length = Number.parseInt(len);
            for (let j = 0; j < length; j++) {
              const word = words.shift();
              if (!word) {
                fail("list element missing");
              }
              list.push(Number.parseFloat(word));
            }
            elem[prop.name] = list;
            break;
          }
          default: {
            const word = words.shift();
            if (!word) {
              fail("value missing");
            }
            elem[prop.name] = Number.parseFloat(word);
            break;
          }
        }
      }
      data.push(elem);
    }
  }
  if (lines.length !== 0) {
    fail("unexpected trailing data");
  }
  return elements;
}
