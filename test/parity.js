// node test/parity.js [name] — compares the graph the cooklang-rs parser gives
// (through src/adapter.js) with the earlier JS reading in test/reference/,
// for every recipe under every choice option and toggle. Differences are
// printed; they are expected only where the two readings disagree on purpose.
const fs = require('fs'), path = require('path');
const P = require('../src/parser.js');
P.load(path.join(__dirname, '..', 'vendor'));
const A = require('../src/adapter.js');
const OLD = require('./reference/js-parser.js');
const root = path.join(__dirname, '..', 'recipes');
const files = fs.readdirSync(root).flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.cook')).map(f => path.join(root, d, f)));
const only = process.argv[2];

const sig = live => live.map(s => s.inputs.map(i => {
  if (i.type === 'leaf') return i.comp.display;
  if (i.type === 'missing') return '?' + i.comp.display;
  const pos = live.indexOf(i.from);
  return 'S' + (pos + 1) + (i.names && i.names.length ? '[' + i.names.map(n => n.name.split(':')[0].trim().toLowerCase()).sort().join(',') + ']' : '');
}).join(' | '));

let runs = 0, same = 0;
for (const f of files) {
  if (only && !f.includes(only)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const first = A.analyse(P.parse(src));
  const sels = [{}];
  for (const c of first.labels.choices) for (const o of c.options) sels.push({ choices: { [c.name]: o } });
  for (const t of first.labels.toggles) sels.push({ toggles: { [t]: true } });
  for (const sel of sels) {
    runs++;
    const na = A.analyse(P.parse(src, sel)), nb = OLD.renderHTML(src, sel).analysis;
    const a = na.graph.live, b = nb.graph.live;
    // edges, then the dish, the rows above the chart, "also makes" and the swaps
    const extra = (an, live) => [
      'root: ' + (an.graph.root ? live.indexOf(an.graph.root) + 1 : '-'),
      'setup: ' + an.graph.setup.map(x => x.raw.replace(/\W+/g, ' ').trim().slice(0, 20).toLowerCase()).join(' / '),
      'also makes: ' + an.graph.alsoMakes.map(x => x.name.toLowerCase() + ':' + x.kind).sort().join(', '),
      'swaps: ' + an.subs.map(x => x.kind === 'group'
        ? (x.chosen.display || x.chosen.name).toLowerCase() + '>' + x.others.map(o => (o.bracket ? o.name : (o.display || o.name || '')).toLowerCase()).join('/')
        : 'optional ' + x.name.toLowerCase()).sort().join(', '),
    ];
    const sa = sig(a).concat(extra(na, a)), sb = sig(b).concat(extra(nb, b));
    if (JSON.stringify(sa) === JSON.stringify(sb)) { same++; continue; }
    console.log('\n' + path.basename(f), JSON.stringify(sel), `parser ${a.length} steps, js ${b.length}`);
    for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
      if (sa[i] !== sb[i]) console.log('  ' + (i < a.length ? 'step ' + (i + 1) : 'summary') + '\n    parser: ' + sa[i] + '\n    js:     ' + sb[i]);
    }
  }
}
console.log(`\n${same} of ${runs} runs draw the same graph, dish, rows above the chart, by-products and swaps`);
