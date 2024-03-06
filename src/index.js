const APPLE = "APPLE";
const KILLER = "KILLER";
const FLOWER = "FLOWER";
const START = "START";
const GRAV_NORMAL = "GRAV_NORMAL";
const GRAV_UP = "GRAV_UP";
const GRAV_RIGHT = "GRAV_RIGHT";
const GRAV_LEFT = "GRAV_LEFT";
const GRAV_DOWN = "GRAV_DOWN";
const CLIP_SKY = "CLIP_SKY";
const CLIP_GROUND = "CLIP_GROUND";
const CLIP_UNDEFINED = "CLIP_UNDEFINED";

const trimString = (buffer) => {
  const index = buffer.indexOf("\x00");
  if (index < 0)
    return buffer.toString();
  return buffer.toString("ascii", 0, index);
};

const parseLevelData = (buffer) => {
  const version = buffer.toString("ascii", 0, 5);
  switch (version) {
    case "POT06":
      return parseAcrossLevel(buffer);
    case "POT14":
      return parseElmaLevel(buffer);
    default:
      throw Error("Not a valid level file");
  }
};

const parseAcrossLevel = (buffer) => {
  let offset = 41;
  const name = buffer.slice(offset, offset + 14).toString();
  offset = 100;
  const polygonCount = buffer.readDoubleLE(100) - 0.4643643;
  offset = 108;

  const polygons = [];

  for (let i = 0; i < polygonCount; i++) {
    const vertexCount = buffer.readInt32LE(offset);
    offset += 4;
    const vertices = [];
    for (let j = 0; j < vertexCount; j++) {
      const x = buffer.readDoubleLE(offset);
      offset += 8;
      const y = buffer.readDoubleLE(offset);
      offset += 8;

      vertices.push({ x, y });
    }
    polygons.push({ vertices, grass: false });
  }
  const objectCount = buffer.readDoubleLE(offset) - 0.4643643;
  const objects = [];

  offset += 8;

  for (let i = 0; i < objectCount; i++) {
    const x = buffer.readDoubleLE(offset);
    offset += 8;
    const y = buffer.readDoubleLE(offset);
    offset += 8;
    const t = buffer.readInt32LE(offset);
    offset += 4;
    objects.push({
      x,
      y,
      type: t === 1 ? FLOWER : t === 2 ? APPLE : t === 3 ? KILLER : START,
    });
  }

  return {
    name,
    polygons,
    objects,
  };
};

const parseElmaLevel = (buffer) => {
  let offset = 7;
  const hash = buffer.readUInt32LE(offset);
  offset += 4;
  const integrity = [];

  for (let i = 0; i < 4; i++) {
    integrity[i] = buffer.readDoubleLE(offset);
    offset += 8;
  }

  const name = trimString(buffer.slice(offset, offset + 51));
  offset += 51;
  const lgr = trimString(buffer.slice(offset, offset + 16));
  offset += 16;
  const foreground = trimString(buffer.slice(offset, offset + 10));
  offset += 10;
  const background = trimString(buffer.slice(offset, offset + 10));
  offset += 10;
  const polygonCount = buffer.readDoubleLE(offset) - 0.4643643;
  const polygons = [];
  offset += 8;

  for (let i = 0; i < polygonCount; i++) {
    const grass = Boolean(buffer.readInt32LE(offset));
    const vertices = [];
    offset += 4;
    const vertexCount = buffer.readInt32LE(offset);
    offset += 4;

    for (let j = 0; j < vertexCount; j++) {
      const x = buffer.readDoubleLE(offset);
      offset += 8;
      const y = buffer.readDoubleLE(offset);
      offset += 8;
      vertices.push({ x, y });
    }

    polygons.push({ grass, vertices });
  }

  const objectCount = buffer.readDoubleLE(offset) - 0.4643643;
  const objects = [];
  offset += 8;

  for (let i = 0; i < objectCount; i++) {
    const x = buffer.readDoubleLE(offset);
    offset += 8;
    const y = buffer.readDoubleLE(offset);
    offset += 8;
    const objType = buffer.readInt32LE(offset);
    offset += 4;
    const gravity = buffer.readInt32LE(offset);
    offset += 4;
    const animation = buffer.readInt32LE(offset) + 1;
    offset += 4;

    const object = (() => {
      switch (objType) {
        case 1:
          return { type: FLOWER };
        case 2:
          return {
            type: APPLE,
            animation: animation,
            gravity: (() => {
              switch (gravity) {
                case 0:
                  return GRAV_NORMAL;
                case 1:
                  return GRAV_UP;
                case 2:
                  return GRAV_DOWN;
                case 3:
                  return GRAV_LEFT;
                case 4:
                  return GRAV_RIGHT;
                default:
                  console.log(
                    "invalid object gravity value, fallback to normal"
                  );
                  return GRAV_NORMAL;
              }
            })(),
          };
        case 3:
          return { type: KILLER };
        case 4:
          return { type: START };
        default:
          console.log("invalid object type value, fallback to flower");
          return { type: FLOWER };
      }
    })();
    objects.push({ ...object, x, y });
  }

  const picCount = buffer.readDoubleLE(offset) - 0.2345672;
  const pictures = [];
  offset += 8;
  for (let i = 0; i < picCount; i++) {
    const name = trimString(buffer.slice(offset, offset + 10));
    offset += 10;
    const texture = trimString(buffer.slice(offset, offset + 10));
    offset += 10;
    const mask = trimString(buffer.slice(offset, offset + 10));
    offset += 10;
    const x = buffer.readDoubleLE(offset);
    offset += 8;
    const y = buffer.readDoubleLE(offset);
    offset += 8;
    const distance = buffer.readInt32LE(offset);
    offset += 4;
    const pictureClip = buffer.readInt32LE(offset);
    offset += 4;
    const clip = (() => {
      switch (pictureClip) {
        case 0:
          return CLIP_UNDEFINED;
        case 1:
          return CLIP_GROUND;
        case 2:
          return CLIP_SKY;
        default:
          console.log("invalid picture clip value, fallback to undefined");
          return CLIP_UNDEFINED;
      }
    })();
    pictures.push({
      ...(name ? { name } : { texture, mask }),
      x,
      y,
      distance,
      clip,
    });
  }
  return {
    name,
    hash,
    lgr,
    foreground,
    background,
    polygons,
    objects,
    pictures,
  };
};

const levToSvg = (data) => {
  const level = parseLevelData(Buffer.from(data));
  let minx;
  let maxx;
  let miny;
  let maxy;
  const svgData = level.polygons
    .filter((p) => !p.grass)
    .map((p) => {
      return p.vertices
        .map((v) => {
          if (minx === undefined || v.x < minx) minx = v.x;
          if (miny === undefined || v.y < miny) miny = v.y;
          if (maxx === undefined || v.x > maxx) maxx = v.x;
          if (maxy === undefined || v.y > maxy) maxy = v.y;
          return [v.x, v.y].join(",");
        })
        .join(" ");
    });
  level.objects.map((o) => {
    if (o.x - 0.4 < minx) minx = o.x - 0.4;
    if (o.x + 0.4 > maxx) maxx = o.x + 0.4;
    if (o.y - 0.4 < miny) miny = o.y - 0.4;
    if (o.y + 0.4 > maxy) maxy = o.y + 0.4;
  });
  const paths = svgData.map((s) => {
    return "M " + s + " z";
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${minx} ${miny} ${maxx - minx
    } ${maxy - miny}">
          <g><path d="${paths.join(
      " "
    )}" class="sky" style="fill: #f1f1f1; fill-rule: evenodd"/></g>${level.objects.map(
      (o) =>
        `<circle class="${o.type} ${o.gravity}" cx="${o.x}" cy="${o.y
        }" r="0.4" fill="${(() => {
          switch (o.type) {
            case APPLE:
              return "#af3030";
            case FLOWER:
              return "#f7b314";
            case START:
              return "#159cd0";
            default:
              return "#000000";
          }
        })()}"/>`
    )}</svg>`;

  return svg;
};

const parseLGRData = (buffer) => {
  let offset = 0;

  const version = buffer.slice(offset, offset += 5).toString();
  const pcxCount = buffer.readUInt32LE(offset);
  offset += 4;
  const ident = buffer.slice(offset, offset += 4);
  const pictureListLength = buffer.readUInt32LE(offset);
  offset += 4;

  const pictureList = [];

  for (let i = 0; i < pictureListLength; i++) {
    const name = trimString(buffer.slice(offset, offset += 10));
    pictureList.push({ name });
  }

  for (let i = 0; i < pictureListLength; i++) {
    const type = buffer.readUInt32LE(offset);
    pictureList[i] = { ...pictureList[i], type };
    offset += 4;
  }

  for (let i = 0; i < pictureListLength; i++) {
    const distance = buffer.readUInt32LE(offset);
    pictureList[i] = { ...pictureList[i], distance };
    offset += 4;
  }

  for (let i = 0; i < pictureListLength; i++) {
    const clipping = buffer.readUInt32LE(offset);
    pictureList[i] = { ...pictureList[i], clipping };
    offset += 4;
  }

  for (let i = 0; i < pictureListLength; i++) {
    const tloc = buffer.readUInt32LE(offset);
    pictureList[i] = { ...pictureList[i], tloc };
    offset += 4;
  }

  const pcxData = [];

  while (buffer.readUInt32LE(offset) !== 0x0b2e05e7) {
    const name = trimString(buffer.slice(offset, offset += 12));
    buffer.slice(offset, offset += 8);
    const dataLength = buffer.readUInt32LE(offset);
    offset += 4;
    const data = buffer.slice(offset, offset += dataLength);
    pcxData.push({
      name,
      data,
      dataLength
    });
  }

  return {
    version,
    pcxCount,
    ident,
    pictureListLength,
    pictureList,
    pcxData
  }
}

module.exports = { parseLevelData, levToSvg, parseLGRData };
