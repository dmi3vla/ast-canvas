var t = [];
function n(e) {
  var n = -1;
  for (var r = 0; r < t.length; r++) {
    if (t[r].identifier === e) {
      n = r;
      break;
    }
  }
  return n;
}
function r(e, r) {
  var i = {};
  var s = [];
  for (var a = 0; a < e.length; a++) {
    var l = e[a];
    var c = r.base ? l[0] + r.base : l[0];
    var d = i[c] || 0;
    var u = `${c} ${d}`;
    i[c] = d + 1;
    var h = n(u);
    var f = {
      css: l[1],
      media: l[2],
      sourceMap: l[3],
      supports: l[4],
      layer: l[5]
    };
    if (h !== -1) {
      t[h].references++;
      t[h].updater(f);
    } else {
      var p = o(f, r);
      r.byIndex = a;
      t.splice(a, 0, {
        identifier: u,
        updater: p,
        references: 1
      });
    }
    s.push(u);
  }
  return s;
}
function o(e, t) {
  var n = t.domAPI(t);
  n.update(e);
  return function (t) {
    if (t) {
      if (t.css === e.css && t.media === e.media && t.sourceMap === e.sourceMap && t.supports === e.supports && t.layer === e.layer) {
        return;
      }
      n.update(e = t);
    } else {
      n.remove();
    }
  };
}
module.exports = function (e, o) {
  var i = r(e = e || [], o = o || {});
  return function (e) {
    e = e || [];
    for (var s = 0; s < i.length; s++) {
      var a = n(i[s]);
      t[a].references--;
    }
    var l = r(e, o);
    for (var c = 0; c < i.length; c++) {
      var d = n(i[c]);
      if (t[d].references === 0) {
        t[d].updater();
        t.splice(d, 1);
      }
    }
    i = l;
  };
};