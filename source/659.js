var t = {};
module.exports = function (e, n) {
  var r = function (e) {
    if (t[e] === undefined) {
      var n = document.querySelector(e);
      if (window.HTMLIFrameElement && n instanceof window.HTMLIFrameElement) {
        try {
          n = n.contentDocument.head;
        } catch (e) {
          n = null;
        }
      }
      t[e] = n;
    }
    return t[e];
  }(e);
  if (!r) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }
  r.appendChild(n);
};