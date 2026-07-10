function n(e, t) {
  var n = e.length;
  e.push(t);
  e: while (n > 0) {
    var r = n - 1 >>> 1;
    var o = e[r];
    if (!(i(o, t) > 0)) {
      break e;
    }
    e[r] = t;
    e[n] = o;
    n = r;
  }
}
function r(e) {
  if (e.length === 0) {
    return null;
  } else {
    return e[0];
  }
}
function o(e) {
  if (e.length === 0) {
    return null;
  }
  var t = e[0];
  var n = e.pop();
  if (n !== t) {
    e[0] = n;
    e: for (var r = 0, o = e.length, s = o >>> 1; r < s;) {
      var a = (r + 1) * 2 - 1;
      var l = e[a];
      var c = a + 1;
      var d = e[c];
      if (i(l, n) < 0) {
        if (c < o && i(d, l) < 0) {
          e[r] = d;
          e[c] = n;
          r = c;
        } else {
          e[r] = l;
          e[a] = n;
          r = a;
        }
      } else {
        if (!(c < o) || !(i(d, n) < 0)) {
          break e;
        }
        e[r] = d;
        e[c] = n;
        r = c;
      }
    }
  }
  return t;
}
function i(e, t) {
  var n = e.sortIndex - t.sortIndex;
  if (n !== 0) {
    return n;
  } else {
    return e.id - t.id;
  }
}
exports.unstable_now = undefined;
if (typeof performance == "object" && typeof performance.now == "function") {
  var s = performance;
  exports.unstable_now = function () {
    return s.now();
  };
} else {
  var a = Date;
  var l = a.now();
  exports.unstable_now = function () {
    return a.now() - l;
  };
}
var c = [];
var d = [];
var u = 1;
var h = null;
var f = 3;
var p = false;
var g = false;
var m = false;
var x = false;
var v = typeof setTimeout == "function" ? setTimeout : null;
var y = typeof clearTimeout == "function" ? clearTimeout : null;
var b = typeof setImmediate != "undefined" ? setImmediate : null;
function w(e) {
  for (var t = r(d); t !== null;) {
    if (t.callback === null) {
      o(d);
    } else {
      if (!(t.startTime <= e)) {
        break;
      }
      o(d);
      t.sortIndex = t.expirationTime;
      n(c, t);
    }
    t = r(d);
  }
}
function k(e) {
  m = false;
  w(e);
  if (!g) {
    if (r(c) !== null) {
      g = true;
      if (!j) {
        j = true;
        S();
      }
    } else {
      var t = r(d);
      if (t !== null) {
        R(k, t.startTime - e);
      }
    }
  }
}
var S;
var j = false;
var C = -1;
var _ = 5;
var N = -1;
function E() {
  return !!x || !(exports.unstable_now() - N < _);
}
function P() {
  x = false;
  if (j) {
    var e = exports.unstable_now();
    N = e;
    var n = true;
    try {
      e: {
        g = false;
        if (m) {
          m = false;
          y(C);
          C = -1;
        }
        p = true;
        var i = f;
        try {
          t: {
            w(e);
            h = r(c);
            while (h !== null && (!(h.expirationTime > e) || !E())) {
              var s = h.callback;
              if (typeof s == "function") {
                h.callback = null;
                f = h.priorityLevel;
                var a = s(h.expirationTime <= e);
                e = exports.unstable_now();
                if (typeof a == "function") {
                  h.callback = a;
                  w(e);
                  n = true;
                  break t;
                }
                if (h === r(c)) {
                  o(c);
                }
                w(e);
              } else {
                o(c);
              }
              h = r(c);
            }
            if (h !== null) {
              n = true;
            } else {
              var l = r(d);
              if (l !== null) {
                R(k, l.startTime - e);
              }
              n = false;
            }
          }
          break e;
        } finally {
          h = null;
          f = i;
          p = false;
        }
        n = undefined;
      }
    } finally {
      if (n) {
        S();
      } else {
        j = false;
      }
    }
  }
}
if (typeof b == "function") {
  S = function () {
    b(P);
  };
} else if (typeof MessageChannel != "undefined") {
  var T = new MessageChannel();
  var M = T.port2;
  T.port1.onmessage = P;
  S = function () {
    M.postMessage(null);
  };
} else {
  S = function () {
    v(P, 0);
  };
}
function R(e, n) {
  C = v(function () {
    e(exports.unstable_now());
  }, n);
}
exports.unstable_IdlePriority = 5;
exports.unstable_ImmediatePriority = 1;
exports.unstable_LowPriority = 4;
exports.unstable_NormalPriority = 3;
exports.unstable_Profiling = null;
exports.unstable_UserBlockingPriority = 2;
exports.unstable_cancelCallback = function (e) {
  e.callback = null;
};
exports.unstable_forceFrameRate = function (e) {
  if (e < 0 || e > 125) {
    console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported");
  } else {
    _ = e > 0 ? Math.floor(1000 / e) : 5;
  }
};
exports.unstable_getCurrentPriorityLevel = function () {
  return f;
};
exports.unstable_next = function (e) {
  switch (f) {
    case 1:
    case 2:
    case 3:
      var t = 3;
      break;
    default:
      t = f;
  }
  var n = f;
  f = t;
  try {
    return e();
  } finally {
    f = n;
  }
};
exports.unstable_requestPaint = function () {
  x = true;
};
exports.unstable_runWithPriority = function (e, t) {
  switch (e) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      break;
    default:
      e = 3;
  }
  var n = f;
  f = e;
  try {
    return t();
  } finally {
    f = n;
  }
};
exports.unstable_scheduleCallback = function (e, o, i) {
  var s = exports.unstable_now();
  i = typeof i == "object" && i !== null && typeof (i = i.delay) == "number" && i > 0 ? s + i : s;
  switch (e) {
    case 1:
      var a = -1;
      break;
    case 2:
      a = 250;
      break;
    case 5:
      a = 1073741823;
      break;
    case 4:
      a = 10000;
      break;
    default:
      a = 5000;
  }
  e = {
    id: u++,
    callback: o,
    priorityLevel: e,
    startTime: i,
    expirationTime: a = i + a,
    sortIndex: -1
  };
  if (i > s) {
    e.sortIndex = i;
    n(d, e);
    if (r(c) === null && e === r(d)) {
      if (m) {
        y(C);
        C = -1;
      } else {
        m = true;
      }
      R(k, i - s);
    }
  } else {
    e.sortIndex = a;
    n(c, e);
    if (!g && !p) {
      g = true;
      if (!j) {
        j = true;
        S();
      }
    }
  }
  return e;
};
exports.unstable_shouldYield = E;
exports.unstable_wrapCallback = function (e) {
  var t = f;
  return function () {
    var n = f;
    f = t;
    try {
      return e.apply(this, arguments);
    } finally {
      f = n;
    }
  };
};