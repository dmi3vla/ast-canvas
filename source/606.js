var t;
var n;
var r = module.exports = {};
function o() {
  throw new Error("setTimeout has not been defined");
}
function i() {
  throw new Error("clearTimeout has not been defined");
}
function s(e) {
  if (t === setTimeout) {
    return setTimeout(e, 0);
  }
  if ((t === o || !t) && setTimeout) {
    t = setTimeout;
    return setTimeout(e, 0);
  }
  try {
    return t(e, 0);
  } catch (n) {
    try {
      return t.call(null, e, 0);
    } catch (n) {
      return t.call(this, e, 0);
    }
  }
}
(function () {
  try {
    t = typeof setTimeout == "function" ? setTimeout : o;
  } catch (e) {
    t = o;
  }
  try {
    n = typeof clearTimeout == "function" ? clearTimeout : i;
  } catch (e) {
    n = i;
  }
})();
var a;
var l = [];
var c = false;
var d = -1;
function u() {
  if (c && a) {
    c = false;
    if (a.length) {
      l = a.concat(l);
    } else {
      d = -1;
    }
    if (l.length) {
      h();
    }
  }
}
function h() {
  if (!c) {
    var e = s(u);
    c = true;
    for (var t = l.length; t;) {
      a = l;
      l = [];
      while (++d < t) {
        if (a) {
          a[d].run();
        }
      }
      d = -1;
      t = l.length;
    }
    a = null;
    c = false;
    (function (e) {
      if (n === clearTimeout) {
        return clearTimeout(e);
      }
      if ((n === i || !n) && clearTimeout) {
        n = clearTimeout;
        return clearTimeout(e);
      }
      try {
        return n(e);
      } catch (t) {
        try {
          return n.call(null, e);
        } catch (t) {
          return n.call(this, e);
        }
      }
    })(e);
  }
}
function f(e, t) {
  this.fun = e;
  this.array = t;
}
function p() {}
r.nextTick = function (e) {
  var t = new Array(arguments.length - 1);
  if (arguments.length > 1) {
    for (var n = 1; n < arguments.length; n++) {
      t[n - 1] = arguments[n];
    }
  }
  l.push(new f(e, t));
  if (l.length === 1 && !c) {
    s(h);
  }
};
f.prototype.run = function () {
  this.fun.apply(null, this.array);
};
r.title = "browser";
r.browser = true;
r.env = {};
r.argv = [];
r.version = "";
r.versions = {};
r.on = p;
r.addListener = p;
r.once = p;
r.off = p;
r.removeListener = p;
r.removeAllListeners = p;
r.emit = p;
r.prependListener = p;
r.prependOnceListener = p;
r.listeners = function (e) {
  return [];
};
r.binding = function (e) {
  throw new Error("process.binding is not supported");
};
r.cwd = function () {
  return "/";
};
r.chdir = function (e) {
  throw new Error("process.chdir is not supported");
};
r.umask = function () {
  return 0;
};