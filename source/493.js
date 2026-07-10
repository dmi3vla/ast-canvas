var r = require("./540.js");
var o = typeof Object.is == "function" ? Object.is : function (e, t) {
  return e === t && (e !== 0 || 1 / e == 1 / t) || e != e && t != t;
};
var i = r.useState;
var s = r.useEffect;
var a = r.useLayoutEffect;
var l = r.useDebugValue;
function c(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !o(e, n);
  } catch (e) {
    return true;
  }
}
var d = typeof window == "undefined" || window.document === undefined || window.document.createElement === undefined ? function (e, t) {
  return t();
} : function (e, t) {
  var n = t();
  var r = i({
    inst: {
      value: n,
      getSnapshot: t
    }
  });
  var o = r[0].inst;
  var d = r[1];
  a(function () {
    o.value = n;
    o.getSnapshot = t;
    if (c(o)) {
      d({
        inst: o
      });
    }
  }, [e, n, t]);
  s(function () {
    if (c(o)) {
      d({
        inst: o
      });
    }
    return e(function () {
      if (c(o)) {
        d({
          inst: o
        });
      }
    });
  }, [e]);
  l(n);
  return n;
};
exports.useSyncExternalStore = r.useSyncExternalStore !== undefined ? r.useSyncExternalStore : d;