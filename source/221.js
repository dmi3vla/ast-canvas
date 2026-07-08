var r = require("./540.js");
function o(e) {
  var t = "https://react.dev/errors/" + e;
  if (arguments.length > 1) {
    t += "?args[]=" + encodeURIComponent(arguments[1]);
    for (var n = 2; n < arguments.length; n++) {
      t += "&args[]=" + encodeURIComponent(arguments[n]);
    }
  }
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
function i() {}
var s = {
  d: {
    f: i,
    r: function () {
      throw Error(o(522));
    },
    D: i,
    C: i,
    L: i,
    m: i,
    X: i,
    S: i,
    M: i
  },
  p: 0,
  findDOMNode: null
};
var a = Symbol.for("react.portal");
var l = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
function c(e, t) {
  if (e === "font") {
    return "";
  } else if (typeof t == "string") {
    if (t === "use-credentials") {
      return t;
    } else {
      return "";
    }
  } else {
    return undefined;
  }
}
exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = s;
exports.createPortal = function (e, t, n = null) {
  if (!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11) {
    throw Error(o(299));
  }
  return function (e, t, n, r = null) {
    return {
      $$typeof: a,
      key: r == null ? null : "" + r,
      children: e,
      containerInfo: t,
      implementation: n
    };
  }(e, t, null, n);
};
exports.flushSync = function (e) {
  var t = l.T;
  var n = s.p;
  try {
    l.T = null;
    s.p = 2;
    if (e) {
      return e();
    }
  } finally {
    l.T = t;
    s.p = n;
    s.d.f();
  }
};
exports.preconnect = function (e, t) {
  if (typeof e == "string") {
    t = t ? typeof (t = t.crossOrigin) == "string" ? t === "use-credentials" ? t : "" : undefined : null;
    s.d.C(e, t);
  }
};
exports.prefetchDNS = function (e) {
  if (typeof e == "string") {
    s.d.D(e);
  }
};
exports.preinit = function (e, t) {
  if (typeof e == "string" && t && typeof t.as == "string") {
    var n = t.as;
    var r = c(n, t.crossOrigin);
    var o = typeof t.integrity == "string" ? t.integrity : undefined;
    var i = typeof t.fetchPriority == "string" ? t.fetchPriority : undefined;
    if (n === "style") {
      s.d.S(e, typeof t.precedence == "string" ? t.precedence : undefined, {
        crossOrigin: r,
        integrity: o,
        fetchPriority: i
      });
    } else if (n === "script") {
      s.d.X(e, {
        crossOrigin: r,
        integrity: o,
        fetchPriority: i,
        nonce: typeof t.nonce == "string" ? t.nonce : undefined
      });
    }
  }
};
exports.preinitModule = function (e, t) {
  if (typeof e == "string") {
    if (typeof t == "object" && t !== null) {
      if (t.as == null || t.as === "script") {
        var n = c(t.as, t.crossOrigin);
        s.d.M(e, {
          crossOrigin: n,
          integrity: typeof t.integrity == "string" ? t.integrity : undefined,
          nonce: typeof t.nonce == "string" ? t.nonce : undefined
        });
      }
    } else if (t == null) {
      s.d.M(e);
    }
  }
};
exports.preload = function (e, t) {
  if (typeof e == "string" && typeof t == "object" && t !== null && typeof t.as == "string") {
    var n = t.as;
    var r = c(n, t.crossOrigin);
    s.d.L(e, n, {
      crossOrigin: r,
      integrity: typeof t.integrity == "string" ? t.integrity : undefined,
      nonce: typeof t.nonce == "string" ? t.nonce : undefined,
      type: typeof t.type == "string" ? t.type : undefined,
      fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : undefined,
      referrerPolicy: typeof t.referrerPolicy == "string" ? t.referrerPolicy : undefined,
      imageSrcSet: typeof t.imageSrcSet == "string" ? t.imageSrcSet : undefined,
      imageSizes: typeof t.imageSizes == "string" ? t.imageSizes : undefined,
      media: typeof t.media == "string" ? t.media : undefined
    });
  }
};
exports.preloadModule = function (e, t) {
  if (typeof e == "string") {
    if (t) {
      var n = c(t.as, t.crossOrigin);
      s.d.m(e, {
        as: typeof t.as == "string" && t.as !== "script" ? t.as : undefined,
        crossOrigin: n,
        integrity: typeof t.integrity == "string" ? t.integrity : undefined
      });
    } else {
      s.d.m(e);
    }
  }
};
exports.requestFormReset = function (e) {
  s.d.r(e);
};
exports.unstable_batchedUpdates = function (e, t) {
  return e(t);
};
exports.useFormState = function (e, t, n) {
  return l.H.useFormState(e, t, n);
};
exports.useFormStatus = function () {
  return l.H.useHostTransitionStatus();
};
exports.version = "19.2.1";