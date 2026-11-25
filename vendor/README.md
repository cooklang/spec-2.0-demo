# The parser

`cooklang_wasm.js` and `cooklang_wasm_bg.wasm` are
[cooklang-rs](https://github.com/cooklang/cooklang-rs), branch `spec-2.0`, commit
`92e924a59d6cca382033eb30062f252e532c3d19`, built to WebAssembly. Licence: MIT, see
`LICENSE-cooklang-rs`.

The demo calls one function, `Parser.parse_spec2(source, selection)`, added on that
branch. It parses with every extension on (the spec 2.0 drafts included) and returns
JSON: `{ recipe, graph, diagnostics }`.

To rebuild after a change on the branch (Rust and wasm-pack needed):

```sh
git clone -b spec-2.0 https://github.com/cooklang/cooklang-rs
cd cooklang-rs/typescript
wasm-pack build --release --target no-modules --out-dir pkg-nomod --no-typescript
cp pkg-nomod/cooklang_wasm.js pkg-nomod/cooklang_wasm_bg.wasm ../../spec-2.0-demo/vendor/
cd ../../spec-2.0-demo && npm test && npm run parity && node build.js
```

Then put the new commit hash above.
