var t = Object.prototype.hasOwnProperty;
var n = Object.prototype.toString;
var r = Object.defineProperty;
var o = Object.getOwnPropertyDescriptor;
function i(e) {
  if (typeof Array.isArray == "function") {
    return Array.isArray(e);
  } else {
    return n.call(e) === "[object Array]";
  }
}
function s(e) {
  if (!e || n.call(e) !== "[object Object]") {
    return false;
  }
  var r;
  var o = t.call(e, "constructor");
  var i = e.constructor && e.constructor.prototype && t.call(e.constructor.prototype, "isPrototypeOf");
  if (e.constructor && !o && !i) {
    return false;
  }
  for (r in e);
  return r === undefined || t.call(e, r);
}
function a(e, t) {
  if (r && t.name === "__proto__") {
    r(e, t.name, {
      enumerable: true,
      configurable: true,
      value: t.newValue,
      writable: true
    });
  } else {
    e[t.name] = t.newValue;
  }
}
function l(e, n) {
  if (n === "__proto__") {
    if (!t.call(e, n)) {
      return;
    }
    if (o) {
      return o(e, n).value;
    }
  }
  return e[n];
}
module.exports = function e() {
  var t;
  var n;
  var r;
  var o;
  var c;
  var d;
  var u = arguments[0];
  var h = 1;
  var f = arguments.length;
  var p = false;
  if (typeof u == "boolean") {
    p = u;
    u = arguments[1] || {};
    h = 2;
  }
  if (u == null || typeof u != "object" && typeof u != "function") {
    u = {};
  }
  for (; h < f; ++h) {
    if ((t = arguments[h]) != null) {
      for (n in t) {
        r = l(u, n);
        if (u !== (o = l(t, n))) {
          if (p && o && (s(o) || (c = i(o)))) {
            if (c) {
              c = false;
              d = r && i(r) ? r : [];
            } else {
              d = r && s(r) ? r : {};
            }
            a(u, {
              name: n,
              newValue: e(p, d, o)
            });
          } else if (o !== undefined) {
            a(u, {
              name: n,
              newValue: o
            });
          }
        }
      }
    }
  }
  return u;
};