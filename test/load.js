// Shared by the tests: the wasm parser, the adapter and the renderer under node.
const path = require('path');
const P = require('../src/parser.js');
P.load(path.join(__dirname, '..', 'vendor'));
const A = require('../src/adapter.js');
const D = require('../src/dag-core.js');
const fs = require('fs');
const root = path.join(__dirname, '..', 'recipes');
const files = fs.readdirSync(root).flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.cook')).map(f => path.join(root, d, f)));
const analyse = (src, sel) => A.analyse(P.parse(src, sel));
const render = (src, sel) => D.renderHTML(analyse(src, sel));
module.exports = { analyse, render, files, fs, path };
