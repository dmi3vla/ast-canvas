var n = Symbol.for("react.transitional.element");
var r = Symbol.for("react.fragment");
function o(e, t, r) {
  var o = null;
  if (r !== undefined) {
    o = "" + r;
  }
  if (t.key !== undefined) {
    o = "" + t.key;
  }
  if ("key" in t) {
    r = {};
    for (var i in t) {
      if (i !== "key") {
        r[i] = t[i];
      }
    }
  } else {
    r = t;
  }
  t = r.ref;
  return {
    $$typeof: n,
    type: e,
    key: o,
    ref: t !== undefined ? t : null,
    props: r
  };
}
exports.Fragment = r;
exports.jsx = o;
exports.jsxs = o;