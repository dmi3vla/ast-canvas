var r = require("./606.js");
var o = Symbol.for("react.transitional.element");
var i = Symbol.for("react.portal");
var s = Symbol.for("react.fragment");
var a = Symbol.for("react.strict_mode");
var l = Symbol.for("react.profiler");
var c = Symbol.for("react.consumer");
var d = Symbol.for("react.context");
var u = Symbol.for("react.forward_ref");
var h = Symbol.for("react.suspense");
var f = Symbol.for("react.memo");
var p = Symbol.for("react.lazy");
var g = Symbol.for("react.activity");
var m = Symbol.iterator;
var x = {
  isMounted: function () {
    return false;
  },
  enqueueForceUpdate: function () {},
  enqueueReplaceState: function () {},
  enqueueSetState: function () {}
};
var v = Object.assign;
var y = {};
function b(e, t, n) {
  this.props = e;
  this.context = t;
  this.refs = y;
  this.updater = n || x;
}
function w() {}
function k(e, t, n) {
  this.props = e;
  this.context = t;
  this.refs = y;
  this.updater = n || x;
}
b.prototype.isReactComponent = {};
b.prototype.setState = function (e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) {
    throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
  }
  this.updater.enqueueSetState(this, e, t, "setState");
};
b.prototype.forceUpdate = function (e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
w.prototype = b.prototype;
var S = k.prototype = new w();
S.constructor = k;
v(S, b.prototype);
S.isPureReactComponent = true;
var j = Array.isArray;
function C() {}
var _ = {
  H: null,
  A: null,
  T: null,
  S: null
};
var N = Object.prototype.hasOwnProperty;
function E(e, t, n) {
  var r = n.ref;
  return {
    $$typeof: o,
    type: e,
    key: t,
    ref: r !== undefined ? r : null,
    props: n
  };
}
function P(e) {
  return typeof e == "object" && e !== null && e.$$typeof === o;
}
var T = /\/+/g;
function M(e, t) {
  if (typeof e == "object" && e !== null && e.key != null) {
    n = "" + e.key;
    r = {
      "=": "=0",
      ":": "=2"
    };
    return "$" + n.replace(/[=:]/g, function (e) {
      return r[e];
    });
  } else {
    return t.toString(36);
  }
  var n;
  var r;
}
function R(e, t, n, r, s) {
  var a = typeof e;
  if (a === "undefined" || a === "boolean") {
    e = null;
  }
  var l;
  var c;
  var d = false;
  if (e === null) {
    d = true;
  } else {
    switch (a) {
      case "bigint":
      case "string":
      case "number":
        d = true;
        break;
      case "object":
        switch (e.$$typeof) {
          case o:
          case i:
            d = true;
            break;
          case p:
            return R((d = e._init)(e._payload), t, n, r, s);
        }
    }
  }
  if (d) {
    s = s(e);
    d = r === "" ? "." + M(e, 0) : r;
    if (j(s)) {
      n = "";
      if (d != null) {
        n = d.replace(T, "$&/") + "/";
      }
      R(s, t, n, "", function (e) {
        return e;
      });
    } else if (s != null) {
      if (P(s)) {
        l = s;
        c = n + (s.key == null || e && e.key === s.key ? "" : ("" + s.key).replace(T, "$&/") + "/") + d;
        s = E(l.type, c, l.props);
      }
      t.push(s);
    }
    return 1;
  }
  d = 0;
  var u;
  var h = r === "" ? "." : r + ":";
  if (j(e)) {
    for (var f = 0; f < e.length; f++) {
      d += R(r = e[f], t, n, a = h + M(r, f), s);
    }
  } else if (typeof (f = (u = e) === null || typeof u != "object" ? null : typeof (u = m && u[m] || u["@@iterator"]) == "function" ? u : null) == "function") {
    e = f.call(e);
    f = 0;
    while (!(r = e.next()).done) {
      d += R(r = r.value, t, n, a = h + M(r, f++), s);
    }
  } else if (a === "object") {
    if (typeof e.then == "function") {
      return R(function (e) {
        switch (e.status) {
          case "fulfilled":
            return e.value;
          case "rejected":
            throw e.reason;
          default:
            if (typeof e.status == "string") {
              e.then(C, C);
            } else {
              e.status = "pending";
              e.then(function (t) {
                if (e.status === "pending") {
                  e.status = "fulfilled";
                  e.value = t;
                }
              }, function (t) {
                if (e.status === "pending") {
                  e.status = "rejected";
                  e.reason = t;
                }
              });
            }
            switch (e.status) {
              case "fulfilled":
                return e.value;
              case "rejected":
                throw e.reason;
            }
        }
        throw e;
      }(e), t, n, r, s);
    }
    t = String(e);
    throw Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  }
  return d;
}
function L(e, t, n) {
  if (e == null) {
    return e;
  }
  var r = [];
  var o = 0;
  R(e, r, "", "", function (e) {
    return t.call(n, e, o++);
  });
  return r;
}
function O(e) {
  if (e._status === -1) {
    var t = e._result;
    (t = t()).then(function (t) {
      if (e._status === 0 || e._status === -1) {
        e._status = 1;
        e._result = t;
      }
    }, function (t) {
      if (e._status === 0 || e._status === -1) {
        e._status = 2;
        e._result = t;
      }
    });
    if (e._status === -1) {
      e._status = 0;
      e._result = t;
    }
  }
  if (e._status === 1) {
    return e._result.default;
  }
  throw e._result;
}
var I = typeof reportError == "function" ? reportError : function (e) {
  if (typeof window == "object" && typeof window.ErrorEvent == "function") {
    var t = new window.ErrorEvent("error", {
      bubbles: true,
      cancelable: true,
      message: typeof e == "object" && e !== null && typeof e.message == "string" ? String(e.message) : String(e),
      error: e
    });
    if (!window.dispatchEvent(t)) {
      return;
    }
  } else if (typeof r == "object" && typeof r.emit == "function") {
    r.emit("uncaughtException", e);
    return;
  }
  console.error(e);
};
var A = {
  map: L,
  forEach: function (e, t, n) {
    L(e, function () {
      t.apply(this, arguments);
    }, n);
  },
  count: function (e) {
    var t = 0;
    L(e, function () {
      t++;
    });
    return t;
  },
  toArray: function (e) {
    return L(e, function (e) {
      return e;
    }) || [];
  },
  only: function (e) {
    if (!P(e)) {
      throw Error("React.Children.only expected to receive a single React element child.");
    }
    return e;
  }
};
exports.Activity = g;
exports.Children = A;
exports.Component = b;
exports.Fragment = s;
exports.Profiler = l;
exports.PureComponent = k;
exports.StrictMode = a;
exports.Suspense = h;
exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = _;
exports.__COMPILER_RUNTIME = {
  __proto__: null,
  c: function (e) {
    return _.H.useMemoCache(e);
  }
};
exports.cache = function (e) {
  return function () {
    return e.apply(null, arguments);
  };
};
exports.cacheSignal = function () {
  return null;
};
exports.cloneElement = function (e, t, n) {
  if (e == null) {
    throw Error("The argument must be a React element, but you passed " + e + ".");
  }
  var r = v({}, e.props);
  var o = e.key;
  if (t != null) {
    if (t.key !== undefined) {
      o = "" + t.key;
    }
    for (i in t) {
      if (!!N.call(t, i) && i !== "key" && i !== "__self" && i !== "__source" && (i !== "ref" || t.ref !== undefined)) {
        r[i] = t[i];
      }
    }
  }
  var i = arguments.length - 2;
  if (i === 1) {
    r.children = n;
  } else if (i > 1) {
    var s = Array(i);
    for (var a = 0; a < i; a++) {
      s[a] = arguments[a + 2];
    }
    r.children = s;
  }
  return E(e.type, o, r);
};
exports.createContext = function (e) {
  (e = {
    $$typeof: d,
    _currentValue: e,
    _currentValue2: e,
    _threadCount: 0,
    Provider: null,
    Consumer: null
  }).Provider = e;
  e.Consumer = {
    $$typeof: c,
    _context: e
  };
  return e;
};
exports.createElement = function (e, t, n) {
  var r;
  var o = {};
  var i = null;
  if (t != null) {
    if (t.key !== undefined) {
      i = "" + t.key;
    }
    for (r in t) {
      if (N.call(t, r) && r !== "key" && r !== "__self" && r !== "__source") {
        o[r] = t[r];
      }
    }
  }
  var s = arguments.length - 2;
  if (s === 1) {
    o.children = n;
  } else if (s > 1) {
    var a = Array(s);
    for (var l = 0; l < s; l++) {
      a[l] = arguments[l + 2];
    }
    o.children = a;
  }
  if (e && e.defaultProps) {
    for (r in s = e.defaultProps) {
      if (o[r] === undefined) {
        o[r] = s[r];
      }
    }
  }
  return E(e, i, o);
};
exports.createRef = function () {
  return {
    current: null
  };
};
exports.forwardRef = function (e) {
  return {
    $$typeof: u,
    render: e
  };
};
exports.isValidElement = P;
exports.lazy = function (e) {
  return {
    $$typeof: p,
    _payload: {
      _status: -1,
      _result: e
    },
    _init: O
  };
};
exports.memo = function (e, t) {
  return {
    $$typeof: f,
    type: e,
    compare: t === undefined ? null : t
  };
};
exports.startTransition = function (e) {
  var t = _.T;
  var n = {};
  _.T = n;
  try {
    var r = e();
    var o = _.S;
    if (o !== null) {
      o(n, r);
    }
    if (typeof r == "object" && r !== null && typeof r.then == "function") {
      r.then(C, I);
    }
  } catch (e) {
    I(e);
  } finally {
    if (t !== null && n.types !== null) {
      t.types = n.types;
    }
    _.T = t;
  }
};
exports.unstable_useCacheRefresh = function () {
  return _.H.useCacheRefresh();
};
exports.use = function (e) {
  return _.H.use(e);
};
exports.useActionState = function (e, t, n) {
  return _.H.useActionState(e, t, n);
};
exports.useCallback = function (e, t) {
  return _.H.useCallback(e, t);
};
exports.useContext = function (e) {
  return _.H.useContext(e);
};
exports.useDebugValue = function () {};
exports.useDeferredValue = function (e, t) {
  return _.H.useDeferredValue(e, t);
};
exports.useEffect = function (e, t) {
  return _.H.useEffect(e, t);
};
exports.useEffectEvent = function (e) {
  return _.H.useEffectEvent(e);
};
exports.useId = function () {
  return _.H.useId();
};
exports.useImperativeHandle = function (e, t, n) {
  return _.H.useImperativeHandle(e, t, n);
};
exports.useInsertionEffect = function (e, t) {
  return _.H.useInsertionEffect(e, t);
};
exports.useLayoutEffect = function (e, t) {
  return _.H.useLayoutEffect(e, t);
};
exports.useMemo = function (e, t) {
  return _.H.useMemo(e, t);
};
exports.useOptimistic = function (e, t) {
  return _.H.useOptimistic(e, t);
};
exports.useReducer = function (e, t, n) {
  return _.H.useReducer(e, t, n);
};
exports.useRef = function (e) {
  return _.H.useRef(e);
};
exports.useState = function (e) {
  return _.H.useState(e);
};
exports.useSyncExternalStore = function (e, t, n) {
  return _.H.useSyncExternalStore(e, t, n);
};
exports.useTransition = function () {
  return _.H.useTransition();
};
exports.version = "19.2.1";