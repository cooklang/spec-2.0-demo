// node test/graphs.js [name]  — print each recipe's graph summary and the parser's reports.
// With a name, also print every step's inputs.
const fs = require('fs'), path = require('path');
const D = require('../src/dag-core.js');
const root = path.join(__dirname, '..', 'recipes');
const files = fs.readdirSync(root).flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.cook')).map(f => path.join(root, d, f)));
const only = process.argv[2];
for (const f of files) {
  if (only && !f.includes(only)) continue;
  const r = D.renderHTML(fs.readFileSync(f, 'utf8'));
  const g = r.analysis.graph;
  console.log(path.basename(f).padEnd(36), 'steps', g.live.length, 'drawn', r.placedCount,
    'main line', r.chart ? r.chart.spine.map(s => s.index + 1).join('>') : '-',
    'also makes', g.alsoMakes.map(a => a.name).join(', ') || '-');
  for (const x of r.analysis.reports) console.log('   ', x.level, x.rule ? 'rule ' + x.rule : '', x.msg);
  if (only) for (const s of g.live) console.log('   ', s.index + 1, s.raw.slice(0, 40).replace(/\n/g, ' '), '<=',
    s.inputs.map(i => i.type === 'step' ? 'step ' + (i.from.index + 1) + (i.names.length ? ' [' + i.names.map(n => n.name + (n.qty ? ' ' + n.qty : '')).join(', ') + ']' : '') : i.comp.display).join(' | '));
}
