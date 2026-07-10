var r = (this && this.__importDefault || function (e) {
  if (e && e.__esModule) {
    return e;
  } else {
    return {
      default: e
    };
  }
})(require("./133.js"));
var o = require("./917.js");
function i(e, t) {
  var n = {};
  if (e && typeof e == "string") {
    (0, r.default)(e, function (e, r) {
      if (e && r) {
        n[(0, o.camelCase)(e, t)] = r;
      }
    });
    return n;
  } else {
    return n;
  }
}
i.default = i;
module.exports = i;