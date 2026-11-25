// node test/sweep.js — render every recipe under every choice option and toggle
// with the cooklang-rs parser; fails if any run throws or leaves a step undrawn.
const { analyse, render, files, fs, path } = require('./load.js');
let runs = 0, bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const a = analyse(src);
  const sels = [{}];
  for (const c of a.labels.choices) for (const o of c.options) sels.push({ choices: { [c.name]: o } });
  for (const t of a.labels.toggles) sels.push({ toggles: { [t]: true } });
  for (const sel of sels) {
    runs++;
    try {
      const r = render(src, sel);
      if (r.missed.length) { bad++; console.log('undrawn steps:', path.basename(f), JSON.stringify(sel)); }
    } catch (e) { bad++; console.log('error:', path.basename(f), JSON.stringify(sel), e.stack); }
  }
}
console.log(runs + ' runs over ' + files.length + ' recipes, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
