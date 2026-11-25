// node build.js  ->  index.html: src/template.html + src/dag-core.js + every recipe under recipes/, inlined.
// The result is one static file: open it from disk or serve it with GitHub Pages.
const fs = require('fs'), path = require('path');
const here = __dirname;
const GROUPS = [
  ['demo', 'Written for this demo'],
  ['examples', 'Spec 2.0 examples'],
  ['pack', 'Recipe pack, converted by hand'],
  ['bases', 'Bases (used by other recipes)'],
];
const recipes = GROUPS.flatMap(([dir, group]) =>
  fs.readdirSync(path.join(here, 'recipes', dir)).filter(f => f.endsWith('.cook')).sort()
    .sort((a, b) => (b === 'Pancakes.cook') - (a === 'Pancakes.cook'))
    .map(f => ({ group, name: f.replace(/\.cook$/, ''), src: fs.readFileSync(path.join(here, 'recipes', dir, f), 'utf8') })));
const read = (...p) => fs.readFileSync(path.join(here, ...p), 'utf8');
const script = js => js.replace(/<\/script/gi, '<\\/script');
const core = read('src', 'dag-core.js');
// the parser: cooklang-rs, spec-2.0 branch, built to wasm (see vendor/README.md)
const glue = read('vendor', 'cooklang_wasm.js');
const wasm = fs.readFileSync(path.join(here, 'vendor', 'cooklang_wasm_bg.wasm')).toString('base64');
const json = JSON.stringify(recipes).replace(/<\//g, '<\\/');
const page = fs.readFileSync(path.join(here, 'src', 'template.html'), 'utf8')
  .replace('/*__WASM_GLUE__*/', () => script(glue))
  .replace('/*__PARSER__*/', () => script(read('src', 'parser.js')))
  .replace('/*__ADAPTER__*/', () => script(read('src', 'adapter.js')))
  .replace('/*__WASM_B64__*/', () => wasm)
  .replace('/*__CORE__*/', () => script(core))
  .replace('/*__RECIPES__*/[]', () => json);
// title, fonts and styles go in <head>; the rest is the body
const cut = page.indexOf('</style>') + '</style>'.length;
const html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  page.slice(0, cut) + '\n</head>\n<body>\n' + page.slice(cut).trim() + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(here, 'index.html'), html);
console.log('index.html:', recipes.length, 'recipes,', html.length, 'bytes');
