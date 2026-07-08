module.exports = function (e) {
  var t = document.createElement("style");
  e.setAttributes(t, e.attributes);
  e.insert(t, e.options);
  return t;
};