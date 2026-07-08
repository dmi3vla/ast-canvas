var r = require("./606.js");
function o(e) {
  if (typeof e != "string") {
    throw new TypeError("Path must be a string. Received " + JSON.stringify(e));
  }
}
function i(e, t) {
  var n;
  var r = "";
  var o = 0;
  var i = -1;
  var s = 0;
  for (var a = 0; a <= e.length; ++a) {
    if (a < e.length) {
      n = e.charCodeAt(a);
    } else {
      if (n === 47) {
        break;
      }
      n = 47;
    }
    if (n === 47) {
      if (i === a - 1 || s === 1) ;else if (i !== a - 1 && s === 2) {
        if (r.length < 2 || o !== 2 || r.charCodeAt(r.length - 1) !== 46 || r.charCodeAt(r.length - 2) !== 46) {
          if (r.length > 2) {
            var l = r.lastIndexOf("/");
            if (l !== r.length - 1) {
              if (l === -1) {
                r = "";
                o = 0;
              } else {
                o = (r = r.slice(0, l)).length - 1 - r.lastIndexOf("/");
              }
              i = a;
              s = 0;
              continue;
            }
          } else if (r.length === 2 || r.length === 1) {
            r = "";
            o = 0;
            i = a;
            s = 0;
            continue;
          }
        }
        if (t) {
          if (r.length > 0) {
            r += "/..";
          } else {
            r = "..";
          }
          o = 2;
        }
      } else {
        if (r.length > 0) {
          r += "/" + e.slice(i + 1, a);
        } else {
          r = e.slice(i + 1, a);
        }
        o = a - i - 1;
      }
      i = a;
      s = 0;
    } else if (n === 46 && s !== -1) {
      ++s;
    } else {
      s = -1;
    }
  }
  return r;
}
var s = {
  resolve: function () {
    var e;
    var t = "";
    for (var n = false, s = arguments.length - 1; s >= -1 && !n; s--) {
      var a;
      if (s >= 0) {
        a = arguments[s];
      } else {
        if (e === undefined) {
          e = r.cwd();
        }
        a = e;
      }
      o(a);
      if (a.length !== 0) {
        t = a + "/" + t;
        n = a.charCodeAt(0) === 47;
      }
    }
    t = i(t, !n);
    if (n) {
      if (t.length > 0) {
        return "/" + t;
      } else {
        return "/";
      }
    } else if (t.length > 0) {
      return t;
    } else {
      return ".";
    }
  },
  normalize: function (e) {
    o(e);
    if (e.length === 0) {
      return ".";
    }
    var t = e.charCodeAt(0) === 47;
    var n = e.charCodeAt(e.length - 1) === 47;
    if ((e = i(e, !t)).length === 0 && !t) {
      e = ".";
    }
    if (e.length > 0 && n) {
      e += "/";
    }
    if (t) {
      return "/" + e;
    } else {
      return e;
    }
  },
  isAbsolute: function (e) {
    o(e);
    return e.length > 0 && e.charCodeAt(0) === 47;
  },
  join: function () {
    if (arguments.length === 0) {
      return ".";
    }
    var e;
    for (var t = 0; t < arguments.length; ++t) {
      var n = arguments[t];
      o(n);
      if (n.length > 0) {
        if (e === undefined) {
          e = n;
        } else {
          e += "/" + n;
        }
      }
    }
    if (e === undefined) {
      return ".";
    } else {
      return s.normalize(e);
    }
  },
  relative: function (e, t) {
    o(e);
    o(t);
    if (e === t) {
      return "";
    }
    if ((e = s.resolve(e)) === (t = s.resolve(t))) {
      return "";
    }
    for (var n = 1; n < e.length && e.charCodeAt(n) === 47; ++n);
    var r = e.length;
    var i = r - n;
    for (var a = 1; a < t.length && t.charCodeAt(a) === 47; ++a);
    var l = t.length - a;
    for (var c = i < l ? i : l, d = -1, u = 0; u <= c; ++u) {
      if (u === c) {
        if (l > c) {
          if (t.charCodeAt(a + u) === 47) {
            return t.slice(a + u + 1);
          }
          if (u === 0) {
            return t.slice(a + u);
          }
        } else if (i > c) {
          if (e.charCodeAt(n + u) === 47) {
            d = u;
          } else if (u === 0) {
            d = 0;
          }
        }
        break;
      }
      var h = e.charCodeAt(n + u);
      if (h !== t.charCodeAt(a + u)) {
        break;
      }
      if (h === 47) {
        d = u;
      }
    }
    var f = "";
    for (u = n + d + 1; u <= r; ++u) {
      if (u === r || e.charCodeAt(u) === 47) {
        if (f.length === 0) {
          f += "..";
        } else {
          f += "/..";
        }
      }
    }
    if (f.length > 0) {
      return f + t.slice(a + d);
    } else {
      a += d;
      if (t.charCodeAt(a) === 47) {
        ++a;
      }
      return t.slice(a);
    }
  },
  _makeLong: function (e) {
    return e;
  },
  dirname: function (e) {
    o(e);
    if (e.length === 0) {
      return ".";
    }
    var t = e.charCodeAt(0);
    var n = t === 47;
    var r = -1;
    var i = true;
    for (var s = e.length - 1; s >= 1; --s) {
      if ((t = e.charCodeAt(s)) === 47) {
        if (!i) {
          r = s;
          break;
        }
      } else {
        i = false;
      }
    }
    if (r === -1) {
      if (n) {
        return "/";
      } else {
        return ".";
      }
    } else if (n && r === 1) {
      return "//";
    } else {
      return e.slice(0, r);
    }
  },
  basename: function (e, t) {
    if (t !== undefined && typeof t != "string") {
      throw new TypeError("\"ext\" argument must be a string");
    }
    o(e);
    var n;
    var r = 0;
    var i = -1;
    var s = true;
    if (t !== undefined && t.length > 0 && t.length <= e.length) {
      if (t.length === e.length && t === e) {
        return "";
      }
      var a = t.length - 1;
      var l = -1;
      for (n = e.length - 1; n >= 0; --n) {
        var c = e.charCodeAt(n);
        if (c === 47) {
          if (!s) {
            r = n + 1;
            break;
          }
        } else {
          if (l === -1) {
            s = false;
            l = n + 1;
          }
          if (a >= 0) {
            if (c === t.charCodeAt(a)) {
              if (--a === -1) {
                i = n;
              }
            } else {
              a = -1;
              i = l;
            }
          }
        }
      }
      if (r === i) {
        i = l;
      } else if (i === -1) {
        i = e.length;
      }
      return e.slice(r, i);
    }
    for (n = e.length - 1; n >= 0; --n) {
      if (e.charCodeAt(n) === 47) {
        if (!s) {
          r = n + 1;
          break;
        }
      } else if (i === -1) {
        s = false;
        i = n + 1;
      }
    }
    if (i === -1) {
      return "";
    } else {
      return e.slice(r, i);
    }
  },
  extname: function (e) {
    o(e);
    var t = -1;
    var n = 0;
    var r = -1;
    var i = true;
    var s = 0;
    for (var a = e.length - 1; a >= 0; --a) {
      var l = e.charCodeAt(a);
      if (l !== 47) {
        if (r === -1) {
          i = false;
          r = a + 1;
        }
        if (l === 46) {
          if (t === -1) {
            t = a;
          } else if (s !== 1) {
            s = 1;
          }
        } else if (t !== -1) {
          s = -1;
        }
      } else if (!i) {
        n = a + 1;
        break;
      }
    }
    if (t === -1 || r === -1 || s === 0 || s === 1 && t === r - 1 && t === n + 1) {
      return "";
    } else {
      return e.slice(t, r);
    }
  },
  format: function (e) {
    if (e === null || typeof e != "object") {
      throw new TypeError("The \"pathObject\" argument must be of type Object. Received type " + typeof e);
    }
    return function (e, t) {
      var n = t.dir || t.root;
      var r = t.base || (t.name || "") + (t.ext || "");
      if (n) {
        if (n === t.root) {
          return n + r;
        } else {
          return n + "/" + r;
        }
      } else {
        return r;
      }
    }(0, e);
  },
  parse: function (e) {
    o(e);
    var t = {
      root: "",
      dir: "",
      base: "",
      ext: "",
      name: ""
    };
    if (e.length === 0) {
      return t;
    }
    var n;
    var r = e.charCodeAt(0);
    var i = r === 47;
    if (i) {
      t.root = "/";
      n = 1;
    } else {
      n = 0;
    }
    var s = -1;
    var a = 0;
    var l = -1;
    var c = true;
    for (var d = e.length - 1, u = 0; d >= n; --d) {
      if ((r = e.charCodeAt(d)) !== 47) {
        if (l === -1) {
          c = false;
          l = d + 1;
        }
        if (r === 46) {
          if (s === -1) {
            s = d;
          } else if (u !== 1) {
            u = 1;
          }
        } else if (s !== -1) {
          u = -1;
        }
      } else if (!c) {
        a = d + 1;
        break;
      }
    }
    if (s === -1 || l === -1 || u === 0 || u === 1 && s === l - 1 && s === a + 1) {
      if (l !== -1) {
        t.base = t.name = a === 0 && i ? e.slice(1, l) : e.slice(a, l);
      }
    } else {
      if (a === 0 && i) {
        t.name = e.slice(1, s);
        t.base = e.slice(1, l);
      } else {
        t.name = e.slice(a, s);
        t.base = e.slice(a, l);
      }
      t.ext = e.slice(s, l);
    }
    if (a > 0) {
      t.dir = e.slice(0, a - 1);
    } else if (i) {
      t.dir = "/";
    }
    return t;
  },
  sep: "/",
  delimiter: ":",
  win32: null,
  posix: null
};
s.posix = s;
module.exports = s;