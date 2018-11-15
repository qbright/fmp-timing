const babel = require("rollup-plugin-babel");


export default {
  input: "src/fmp-timing.js",
  plugins: [
    babel({
      exclude: "node_modules/**"
    })
  ],
  output: {
    file: "./dest/fmp-timing.js",
    format: "iife"
  }
};
