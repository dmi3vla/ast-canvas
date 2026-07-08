Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.camelCase = undefined;
var n = /^--[a-zA-Z0-9_-]+$/;
var r = /-([a-z])/g;
var o = /^[^-]+$/;
var i = /^-(webkit|moz|ms|o|khtml)-/;
var s = /^-(ms)-/;
function a(e, t) {
  return t.toUpperCase();
}
function l(e, t) {
  return `${t}-`;
}
exports.camelCase = function (e, t = {}) {
  if (function (e) {
    return !e || o.test(e) || n.test(e);
  }(e)) {
    return e;
  } else {
    e = e.toLowerCase();
    return (e = t.reactCompat ? e.replace(s, l) : e.replace(i, l)).replace(r, a);
  }
};