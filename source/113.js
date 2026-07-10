module.exports = function (e, t) {
  if (t.styleSheet) {
    t.styleSheet.cssText = e;
  } else {
    while (t.firstChild) {
      t.removeChild(t.firstChild);
    }
    t.appendChild(document.createTextNode(e));
  }
};