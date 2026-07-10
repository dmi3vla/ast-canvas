var t = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
var n = /\n/g;
var r = /^\s*/;
var o = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/;
var i = /^:\s*/;
var s = /^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/;
var a = /^[;\s]*/;
var l = /^\s+|\s+$/g;
var c = "";
function d(e) {
  if (e) {
    return e.replace(l, c);
  } else {
    return c;
  }
}
module.exports = function (e, l) {
  if (typeof e != "string") {
    throw new TypeError("First argument must be a string");
  }
  if (!e) {
    return [];
  }
  l = l || {};
  var u = 1;
  var h = 1;
  function f(e) {
    var t = e.match(n);
    if (t) {
      u += t.length;
    }
    var r = e.lastIndexOf("\n");
    h = ~r ? e.length - r : h + e.length;
  }
  function p() {
    var e = {
      line: u,
      column: h
    };
    return function (t) {
      t.position = new g(e);
      v();
      return t;
    };
  }
  function g(e) {
    this.start = e;
    this.end = {
      line: u,
      column: h
    };
    this.source = l.source;
  }
  function m(t) {
    var n = new Error(l.source + ":" + u + ":" + h + ": " + t);
    n.reason = t;
    n.filename = l.source;
    n.line = u;
    n.column = h;
    n.source = e;
    if (!l.silent) {
      throw n;
    }
  }
  function x(t) {
    var n = t.exec(e);
    if (n) {
      var r = n[0];
      f(r);
      e = e.slice(r.length);
      return n;
    }
  }
  function v() {
    x(r);
  }
  function y(e) {
    var t;
    for (e = e || []; t = b();) {
      if (t !== false) {
        e.push(t);
      }
    }
    return e;
  }
  function b() {
    var t = p();
    if (e.charAt(0) == "/" && e.charAt(1) == "*") {
      for (var n = 2; c != e.charAt(n) && (e.charAt(n) != "*" || e.charAt(n + 1) != "/");) {
        ++n;
      }
      n += 2;
      if (c === e.charAt(n - 1)) {
        return m("End of comment missing");
      }
      var r = e.slice(2, n - 2);
      h += 2;
      f(r);
      e = e.slice(n);
      h += 2;
      return t({
        type: "comment",
        comment: r
      });
    }
  }
  function w() {
    var e = p();
    var n = x(o);
    if (n) {
      b();
      if (!x(i)) {
        return m("property missing ':'");
      }
      var r = x(s);
      var l = e({
        type: "declaration",
        property: d(n[0].replace(t, c)),
        value: r ? d(r[0].replace(t, c)) : c
      });
      x(a);
      return l;
    }
  }
  g.prototype.content = e;
  v();
  return function () {
    var e;
    var t = [];
    for (y(t); e = w();) {
      if (e !== false) {
        t.push(e);
        y(t);
      }
    }
    return t;
  }();
};