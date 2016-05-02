'use strict';

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy){
  var v0 = [cx-ax,cy-ay];
  var v1 = [bx-ax,by-ay];
  var v2 = [px-ax,py-ay];
  var dot00 = (v0[0]*v0[0]) + (v0[1]*v0[1]);
  var dot01 = (v0[0]*v1[0]) + (v0[1]*v1[1]);
  var dot02 = (v0[0]*v2[0]) + (v0[1]*v2[1]);
  var dot11 = (v1[0]*v1[0]) + (v1[1]*v1[1]);
  var dot12 = (v1[0]*v2[0]) + (v1[1]*v2[1]);
  var invDenom = 1/ (dot00 * dot11 - dot01 * dot01);
  var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return ((u >= 0) && (v >= 0) && (u + v < 1));
};

function rgbToHex(r, g, b) {
  var rh =  r.toString(16);
  rh = rh.length < 2 ? "0" + rh : rh;
  var gh =  g.toString(16);
  gh = gh.length < 2 ? "0" + gh : gh;
  var bh =  b.toString(16);
  bh = bh.length < 2 ? "0" + bh : bh;

  return (rh + gh + bh);
}

function xyToHex(x, y, brightness) {
  // Gamut A triangle corners
  // Red: 0.704, 0.296
  // Green: 0.2151, 0.7106
  // Blue: 0.138, 0.08

  // conversion is explained in hue documentation (sort of)

  // 1) is xy within color gamut of lam
  if (!pointInTriangle(x, y,
      0.704, 0.296,
      0.2151, 0.7106,
      0.138, 0.08)) {
      console.log("shit");
      // TODO: find closest point on triangle
  }

  var z = 1.0 - x - y;
  var Y = brightness/255.0;
  var X = (Y / y) * x;
  var Z = (Y / y) * z;

  // 2) RGB conversion
  var r =  X * 1.656492 - Y * 0.354851 - Z * 0.255038;
  var g = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
  var b =  X * 0.051713 - Y * 0.121364 + Z * 1.011530;

  // 3) Reverse gamma correction
  r = r <= 0.0031308 ? 12.92 * r : (1.0 + 0.055) * Math.pow(r, (1.0 / 2.4)) - 0.055;
  g = g <= 0.0031308 ? 12.92 * g : (1.0 + 0.055) * Math.pow(g, (1.0 / 2.4)) - 0.055;
  b = b <= 0.0031308 ? 12.92 * b : (1.0 + 0.055) * Math.pow(b, (1.0 / 2.4)) - 0.055;

  // 4) Bound them
  r = r > 1.0 ? 1.0 : r;
  g = g > 1.0 ? 1.0 : g;
  b = b > 1.0 ? 1.0 : b;

  // 5) To hex
  // rgb is between 0.0 and 1.0
  return (rgbToHex(Math.round(r*255), Math.round(g*255), Math.round(b*255)));
};

function hslToHex(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return (rgbToHex(Math.round(r*255), Math.round(g*255), Math.round(b*255)));
}

module.exports = {
  xyToHex: xyToHex,
  hslToHex: hslToHex
};
