module.exports = function (e) {
  var t = require.nc;
  if (t) {
    e.setAttribute("nonce", t);
  }
};