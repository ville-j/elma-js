"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var APPLE = "APPLE";
var KILLER = "KILLER";
var FLOWER = "FLOWER";
var START = "START";
var GRAV_NORMAL = "GRAV_NORMAL";
var GRAV_UP = "GRAV_UP";
var GRAV_RIGHT = "GRAV_RIGHT";
var GRAV_LEFT = "GRAV_LEFT";
var GRAV_DOWN = "GRAV_DOWN";
var CLIP_SKY = "CLIP_SKY";
var CLIP_GROUND = "CLIP_GROUND";
var CLIP_UNDEFINED = "CLIP_UNDEFINED";

var trimString = function trimString(buffer) {
  var index = buffer.indexOf("\x00");
  return buffer.toString("ascii", 0, index !== -1 ? index : null);
};

var parseLevelData = function parseLevelData(buffer) {
  var version = buffer.toString("ascii", 0, 5);

  switch (version) {
    case "POT06":
      return parseAcrossLevel(buffer);

    case "POT14":
      return parseElmaLevel(buffer);

    default:
      throw Error("Not a valid level file");
  }
};

var parseAcrossLevel = function parseAcrossLevel(buffer) {
  var offset = 41;
  var name = buffer.slice(offset, offset + 14).toString();
  offset = 100;
  var polygonCount = buffer.readDoubleLE(100) - 0.4643643;
  offset = 108;
  var polygons = [];

  for (var i = 0; i < polygonCount; i++) {
    var vertexCount = buffer.readInt32LE(offset);
    offset += 4;
    var vertices = [];

    for (var j = 0; j < vertexCount; j++) {
      var x = buffer.readDoubleLE(offset);
      offset += 8;
      var y = buffer.readDoubleLE(offset);
      offset += 8;
      vertices.push({
        x: x,
        y: y
      });
    }

    polygons.push({
      vertices: vertices,
      grass: false
    });
  }

  var objectCount = buffer.readDoubleLE(offset) - 0.4643643;
  var objects = [];
  offset += 8;

  for (var _i = 0; _i < objectCount; _i++) {
    var _x = buffer.readDoubleLE(offset);

    offset += 8;

    var _y = buffer.readDoubleLE(offset);

    offset += 8;
    var t = buffer.readInt32LE(offset);
    offset += 4;
    objects.push({
      x: _x,
      y: _y,
      type: t === 1 ? FLOWER : t === 2 ? APPLE : t === 3 ? KILLER : START
    });
  }

  return {
    name: name,
    polygons: polygons,
    objects: objects
  };
};

var parseElmaLevel = function parseElmaLevel(buffer) {
  var offset = 7;
  var hash = buffer.readUInt32LE(offset);
  offset += 4;
  var integrity = [];

  for (var i = 0; i < 4; i++) {
    integrity[i] = buffer.readDoubleLE(offset);
    offset += 8;
  }

  var name = trimString(buffer.slice(offset, offset + 51));
  offset += 51;
  var lgr = trimString(buffer.slice(offset, offset + 16));
  offset += 16;
  var foreground = trimString(buffer.slice(offset, offset + 10));
  offset += 10;
  var background = trimString(buffer.slice(offset, offset + 10));
  offset += 10;
  var polygonCount = buffer.readDoubleLE(offset) - 0.4643643;
  var polygons = [];
  offset += 8;

  for (var _i2 = 0; _i2 < polygonCount; _i2++) {
    var grass = Boolean(buffer.readInt32LE(offset));
    var vertices = [];
    offset += 4;
    var vertexCount = buffer.readInt32LE(offset);
    offset += 4;

    for (var j = 0; j < vertexCount; j++) {
      var x = buffer.readDoubleLE(offset);
      offset += 8;
      var y = buffer.readDoubleLE(offset);
      offset += 8;
      vertices.push({
        x: x,
        y: y
      });
    }

    polygons.push({
      grass: grass,
      vertices: vertices
    });
  }

  var objectCount = buffer.readDoubleLE(offset) - 0.4643643;
  var objects = [];
  offset += 8;

  var _loop = function _loop(_i3) {
    var x = buffer.readDoubleLE(offset);
    offset += 8;
    var y = buffer.readDoubleLE(offset);
    offset += 8;
    var objType = buffer.readInt32LE(offset);
    offset += 4;
    var gravity = buffer.readInt32LE(offset);
    offset += 4;
    var animation = buffer.readInt32LE(offset) + 1;
    offset += 4;

    var object = function () {
      switch (objType) {
        case 1:
          return {
            type: FLOWER
          };

        case 2:
          return {
            type: APPLE,
            animation: animation,
            gravity: function () {
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
                  throw Error("invalid object gravity value");
              }
            }()
          };

        case 3:
          return {
            type: KILLER
          };

        case 4:
          return {
            type: START
          };

        default:
          throw Error("invalid object type value");
      }
    }();

    objects.push(_objectSpread({}, object, {
      x: x,
      y: y
    }));
  };

  for (var _i3 = 0; _i3 < objectCount; _i3++) {
    _loop(_i3);
  }

  var picCount = buffer.readDoubleLE(offset) - 0.2345672;
  var pictures = [];
  offset += 8;

  var _loop2 = function _loop2(_i4) {
    var name = trimString(buffer.slice(offset, offset + 10));
    offset += 10;
    var texture = trimString(buffer.slice(offset, offset + 10));
    offset += 10;
    var mask = trimString(buffer.slice(offset, offset + 10));
    offset += 10;
    var x = buffer.readDoubleLE(offset);
    offset += 8;
    var y = buffer.readDoubleLE(offset);
    offset += 8;
    var distance = buffer.readInt32LE(offset);
    offset += 4;
    var pictureClip = buffer.readInt32LE(offset);
    offset += 4;

    var clip = function () {
      switch (pictureClip) {
        case 0:
          return CLIP_UNDEFINED;

        case 1:
          return CLIP_GROUND;

        case 2:
          return CLIP_SKY;

        default:
          throw Error("invalid picture clip value");
      }
    }();

    pictures.push(_objectSpread({}, name ? {
      name: name
    } : {
      texture: texture,
      mask: mask
    }, {
      x: x,
      y: y,
      distance: distance,
      clip: clip
    }));
  };

  for (var _i4 = 0; _i4 < picCount; _i4++) {
    _loop2(_i4);
  }

  return {
    name: name,
    hash: hash,
    lgr: lgr,
    foreground: foreground,
    background: background,
    polygons: polygons,
    objects: objects,
    pictures: pictures
  };
};

var levToSvg = function levToSvg(data) {
  var level = parseLevelData(Buffer.from(data));
  var minx;
  var maxx;
  var miny;
  var maxy;
  var svgData = level.polygons.filter(function (p) {
    return !p.grass;
  }).map(function (p) {
    return p.vertices.map(function (v) {
      if (minx === undefined || v.x < minx) minx = v.x;
      if (miny === undefined || v.y < miny) miny = v.y;
      if (maxx === undefined || v.x > maxx) maxx = v.x;
      if (maxy === undefined || v.y > maxy) maxy = v.y;
      return [v.x, v.y].join(",");
    }).join(" ");
  });
  level.objects.map(function (o) {
    if (o.x - 0.4 < minx) minx = o.x - 0.4;
    if (o.x + 0.4 > maxx) maxx = o.x + 0.4;
    if (o.y - 0.4 < miny) miny = o.y - 0.4;
    if (o.y + 0.4 > maxy) maxy = o.y + 0.4;
  });
  var paths = svgData.map(function (s) {
    return "M " + s + " z";
  });
  var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:svg=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"".concat(minx, " ").concat(miny, " ").concat(maxx - minx, " ").concat(maxy - miny, "\">\n          <g><path d=\"").concat(paths.join(" "), "\" style=\"fill: #f1f1f1; fill-rule: evenodd\"/></g>").concat(level.objects.map(function (o) {
    return "<circle cx=\"".concat(o.x, "\" cy=\"").concat(o.y, "\" r=\"0.4\" fill=\"").concat(function () {
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
    }(), "\"/>");
  }), "</svg>");
  return svg;
};

module.exports = {
  parseLevelData: parseLevelData,
  levToSvg: levToSvg
};