module.exports = function (e) {
  var t = [];
  t.toString = function () {
    return this.map(function (t) {
      var n = "";
      var r = t[5] !== undefined;
      if (t[4]) {
        n += `@supports (${t[4]}) {`;
      }
      if (t[2]) {
        n += `@media ${t[2]} {`;
      }
      if (r) {
        n += `@layer${t[5].length > 0 ? ` ${t[5]}` : ""} {`;
      }
      n += e(t);
      if (r) {
        n += "}";
      }
      if (t[2]) {
        n += "}";
      }
      if (t[4]) {
        n += "}";
      }
      return n;
    }).join("");
  };
  t.i = function (e, n, r, o, i) {
    if (typeof e == "string") {
      e = [[null, e, undefined]];
    }
    var s = {};
    if (r) {
      for (var a = 0; a < this.length; a++) {
        var l = this[a][0];
        if (l != null) {
          s[l] = true;
        }
      }
    }
    for (var c = 0; c < e.length; c++) {
      var d = [].concat(e[c]);
      if (!r || !s[d[0]]) {
        if (i !== undefined) {
          if (d[5] !== undefined) {
            d[1] = `@layer${d[5].length > 0 ? ` ${d[5]}` : ""} {${d[1]}}`;
          }
          d[5] = i;
        }
        if (n) {
          if (d[2]) {
            d[1] = `@media ${d[2]} {${d[1]}}`;
            d[2] = n;
          } else {
            d[2] = n;
          }
        }
        if (o) {
          if (d[4]) {
            d[1] = `@supports (${d[4]}) {${d[1]}}`;
            d[4] = o;
          } else {
            d[4] = `${o}`;
          }
        }
        t.push(d);
      }
    }
  };
  return t;
};