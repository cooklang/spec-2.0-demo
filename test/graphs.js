// node test/graphs.js [name] — print each recipe's graph summary and the reports.
// With a name, also print every step's inputs.
const { analyse, render, files, fs, path } = require('./load.js');
const only = process.argv[2];
for (const f of files) {
  if (only && !f.includes(only)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const r = render(src);
  const a = r.analysis, g = a.graph;
  console.log(path.basename(f).padEnd(36), 'steps', g.live.length, 'drawn', r.placedCount,
    'main line', r.chart ? r.chart.spine.map(s => s.index + 1).join('>') : '-',
    'also makes', g.alsoMakes.map(x => x.name).join(', ') || '-');
  for (const x of a.reports) console.log('   ', x.level, x.rule ? 'rule ' + x.rule : '', x.msg);
  if (only) for (const s of g.live) console.log('   ', s.index + 1, s.raw.slice(0, 40), '<=',
    s.inputs.map(i => i.type === 'step' ? 'step ' + (i.from.index + 1) + (i.names.length ? ' [' + i.names.map(n => n.name + (n.qty ? ' ' + n.qty : '')).join(', ') + ']' : '') : i.comp.display).join(' | '));
}
