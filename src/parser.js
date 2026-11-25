/*
 * parser.js — loads the cooklang-rs parser (spec-2.0 branch, built to wasm with
 * `wasm-pack build --target no-modules`) and exposes
 * `CookParser.parse(source, selection)`, which returns the JSON of
 * `Parser.parse_spec2`: `{ recipe, graph, diagnostics }`.
 *
 * In the page the wasm bytes are inlined as base64 by build.js, so the page
 * still opens from disk. Under node, `load(dir)` reads them from vendor/.
 */
(function (root) {
  'use strict';
  let parser = null;

  function init(bytes) {
    root.wasm_bindgen.initSync({ module: bytes });
    parser = new root.wasm_bindgen.Parser();
  }

  function fromBase64(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function parse(source, selection) {
    if (!parser) throw new Error('The parser is not loaded yet.');
    return parser.parse_spec2(source, JSON.stringify(selection || {}));
  }

  // node: read the glue and the wasm from a directory
  function load(dir) {
    const fs = require('fs'), path = require('path'), vm = require('vm');
    root.self = root;
    vm.runInThisContext(fs.readFileSync(path.join(dir, 'cooklang_wasm.js'), 'utf8') + '\nglobalThis.wasm_bindgen = wasm_bindgen;');
    init(fs.readFileSync(path.join(dir, 'cooklang_wasm_bg.wasm')));
  }

  const api = { init, fromBase64, parse, load };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CookParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
