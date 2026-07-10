var r = require("./540.js");
var o = require("./888.js");
var i = typeof Object.is == "function" ? Object.is : function (e, t) {
  return e === t && (e !== 0 || 1 / e == 1 / t) || e != e && t != t;
};
var s = o.useSyncExternalStore;
var a = r.useRef;
var l = r.useEffect;
var c = r.useMemo;
var d = r.useDebugValue;
exports.useSyncExternalStoreWithSelector = function (e, t, n, r, o) {
  var u = a(null);
  if (u.current === null) {
    var h = {
      hasValue: false,
      value: null
    };
    u.current = h;
  } else {
    h = u.current;
  }
  u = c(function () {
    function e(e) {
      if (!l) {
        l = true;
        s = e;
        e = r(e);
        if (o !== undefined && h.hasValue) {
          var t = h.value;
          if (o(t, e)) {
            return a = t;
          }
        }
        return a = e;
      }
      t = a;
      if (i(s, e)) {
        return t;
      }
      var n = r(e);
      if (o !== undefined && o(t, n)) {
        s = e;
        return t;
      } else {
        s = e;
        return a = n;
      }
    }
    var s;
    var a;
    var l = false;
    var c = n === undefined ? null : n;
    return [function () {
      return e(t());
    }, c === null ? undefined : function () {
      return e(c());
    }];
  }, [t, n, r, o]);
  var f = s(e, u[0], u[1]);
  l(function () {
    h.hasValue = true;
    h.value = f;
  }, [f]);
  d(f);
  return f;
};