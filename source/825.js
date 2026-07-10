module.exports = function (e) {
  if (typeof document == "undefined") {
    return {
      update: function () {},
      remove: function () {}
    };
  }
  var t = e.insertStyleElement(e);
  return {
    update: function (n) {
      (function (e, t, n) {
        var r = "";
        if (n.supports) {
          r += `@supports (${n.supports}) {`;
        }
        if (n.media) {
          r += `@media ${n.media} {`;
        }
        var o = n.layer !== undefined;
        if (o) {
          r += `@layer${n.layer.length > 0 ? ` ${n.layer}` : ""} {`;
        }
        r += n.css;
        if (o) {
          r += "}";
        }
        if (n.media) {
          r += "}";
        }
        if (n.supports) {
          r += "}";
        }
        var i = n.sourceMap;
        if (i && typeof btoa != "undefined") {
          r += `
/*# sourceMappingURL=data:application/json;base64,${btoa(unescape(encodeURIComponent(JSON.stringify(i))))} */`;
        }
        t.styleTagTransform(r, e, t.options);
      })(t, e, n);
    },
    remove: function () {
      (function (e) {
        if (e.parentNode === null) {
          return false;
        }
        e.parentNode.removeChild(e);
      })(t);
    }
  };
};