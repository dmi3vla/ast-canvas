var r = this && this.__importDefault || function (e) {
  if (e && e.__esModule) {
    return e;
  } else {
    return {
      default: e
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = function (e, t) {
  let n = null;
  if (!e || typeof e != "string") {
    return n;
  }
  const r = (0, o.default)(e);
  const i = typeof t == "function";
  r.forEach(e => {
    if (e.type !== "declaration") {
      return;
    }
    const {
      property: r,
      value: o
    } = e;
    if (i) {
      t(r, o, e);
    } else if (o) {
      n = n || {};
      n[r] = o;
    }
  });
  return n;
};
const o = r(require("./77.js"));