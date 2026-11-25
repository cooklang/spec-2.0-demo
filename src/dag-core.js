/*
 * dag-core.js — lays out and draws the recipe graph that the cooklang-rs
 * spec-2.0 parser returns (products, proposal 0027, cooklang/spec#165), with
 * step actions (0029, cooklang/spec#167) as block labels and alternatives and
 * labels (0025, cooklang/spec#162) as the substitutions box and the pickers.
 *
 * Pure: no DOM. `renderHTML(analysis)` takes what `CookAdapter.analyse`
 * returns and gives the drawing as an HTML string. Runs in the browser
 * (window.CookDag) and under node (module.exports).
 */
(function (root) {
  'use strict';


  // ---------------------------------------------------------------- quantities
  const VULGAR = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/8': '⅛', '3/8': '⅜', '1/5': '⅕' };
  const DEC = { 0.5: '½', 0.25: '¼', 0.75: '¾', 0.125: '⅛' };

  function fmtNumber(a) {
    a = a.trim();
    if (VULGAR[a]) return VULGAR[a];
    let m = a.match(/^(\d+)\s+(\d+\/\d+)$/);
    if (m && VULGAR[m[2]]) return m[1] + ' ' + VULGAR[m[2]];
    m = a.match(/^(\d*)\.(\d+)$/);
    if (m) {
      const frac = Number('0.' + m[2]);
      if (DEC[frac]) return (m[1] && m[1] !== '0' ? m[1] + ' ' : '') + DEC[frac];
    }
    m = a.match(/^(.+?)-(.+)$/);
    if (m && /\d/.test(m[1]) && /\d/.test(m[2])) return fmtNumber(m[1]) + '–' + fmtNumber(m[2]);
    return a;
  }

  // "{1.5%cup}" -> "1 ½ cup"; "{4%oz|115%g}" -> "4 oz (115 g)"; "{pale gold}" -> "pale gold"
  function fmtQty(raw) {
    if (raw == null) return '';
    raw = raw.trim().replace(/^=/, '').trim();
    if (!raw) return '';
    const parts = raw.split('|').map(p => {
      const [a, u] = p.split('%');
      if (u === undefined) return /\d/.test(a) ? fmtNumber(a) : a.trim();
      return (fmtNumber(a) + ' ' + u.trim()).trim();
    });
    return parts[0] + (parts.length > 1 ? ' (' + parts.slice(1).join(', ') + ')' : '');
  }

  // ---------------------------------------------------------------- layout
  // saffron, blueberry, beetroot, basil, plum, carrot, mint, aubergine, lemon, tomato
  const HUES = [42, 218, 338, 148, 290, 24, 172, 262, 54, 8];
  const SPINE_HUE = 205;  // the main line is slate

  function leafCount(node, memo) {
    if (memo.has(node)) return memo.get(node);
    memo.set(node, 1);
    let n = 0;
    for (const i of node.inputs) n += i.type === 'step' ? leafCount(i.from, memo) : 1;
    n = Math.max(1, n);
    memo.set(node, n);
    return n;
  }
  function height(node, memo) {
    if (memo.has(node)) return memo.get(node);
    memo.set(node, 0);
    let h = 0;
    for (const i of node.inputs) if (i.type === 'step') h = Math.max(h, height(i.from, memo));
    memo.set(node, h + 1);
    return h + 1;
  }

  function pickPrimary(cands, ctx) {
    return [...cands].sort((a, b) =>
      leafCount(b.from, ctx.lc) - leafCount(a.from, ctx.lc) ||
      height(b.from, ctx.ht) - height(a.from, ctx.ht) ||
      a.from.index - b.from.index)[0];
  }

  // Build one chart: a vertical spine ending in `rootNode`, branches as table rows to its left.
  function layoutChart(rootNode, ctx) {
    const spine = [rootNode];
    const on = new Set([rootNode]);
    let cur = rootNode;
    for (;;) {
      const cands = cur.inputs.filter(i => i.type === 'step' && !ctx.placed.has(i.from) && !on.has(i.from));
      if (!cands.length) break;
      const nx = pickPrimary(cands, ctx).from;
      spine.push(nx);
      on.add(nx);
      cur = nx;
    }
    spine.reverse();
    spine.forEach((s, k) => { ctx.placed.add(s); s.hue = k === 0 && spine.length > 1 ? ctx.nextHue() : SPINE_HUE; s.onSpine = true; s.spinePos = k; s.spineLen = spine.length; });
    if (spine.length === 1) spine[0].hue = ctx.nextHue();

    const build = (inp, hue) => {
      if (inp.type === 'leaf') return { kind: 'leaf', comp: inp.comp, rows: 1, depth: 0, hue };
      if (inp.type === 'missing') return { kind: 'missing', comp: inp.comp, rows: 1, depth: 0, hue };
      const node = inp.from;
      if (ctx.placed.has(node)) return { kind: 'ref', node, names: inp.names, rows: 1, depth: 0, hue: node.hue };
      ctx.placed.add(node);
      node.hue = hue;
      const stepIns = node.inputs.filter(i => i.type === 'step' && !ctx.placed.has(i.from));
      const primary = stepIns.length ? pickPrimary(stepIns, ctx) : null;
      const kids = node.inputs.map(i => build(i, i.type !== 'step' ? hue : i === primary && i.from.products.length < 2 ? hue : branchHue(i.from)));
      const rows = Math.max(1, kids.reduce((a, k) => a + k.rows, 0));
      const depth = 1 + kids.reduce((a, k) => Math.max(a, k.depth), 0);
      return { kind: 'step', node, names: inp.names, kids, rows, depth, hue };
    };

    // RENDERER: a branch whose only feed is something already drawn keeps that thing's colour
    // (the whites stay the colour of the eggs they were separated from).
    function branchHue(node) {
      const ins = node.inputs.filter(i => i.type === 'step');
      if (ins.length && ins.every(i => ctx.placed.has(i.from)) && ins[0].from.hue !== SPINE_HUE) return ins[0].from.hue;
      return ctx.nextHue();
    }
    const bands = spine.map((s, k) => {
      const prevSpine = spine[k - 1];
      const carried = s.inputs.find(i => i.type === 'step' && i.from === prevSpine) || null;
      const items = s.inputs.filter(i => i !== carried).map(i => build(i, i.type === 'step' ? branchHue(i.from) : s.hue));
      return { node: s, carried, items, rows: Math.max(1, items.reduce((a, it) => a + it.rows, 0)), depth: items.reduce((a, it) => Math.max(a, it.depth), 0) };
    });
    return { spine, bands, depth: bands.reduce((a, b) => Math.max(a, b.depth), 0) };
  }

  // ---------------------------------------------------------------- HTML
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

  function compLabel(c) {
    if (c.kind === 'timer') {
      const q = fmtQty(c.qtyRaw);
      return q || c.display;
    }
    return c.display;
  }

  function stepTextHTML(st) {
    let html = '';
    for (const sg of st.segs) {
      if (sg.t === 'text') html += esc(sg.v);
      else if (sg.t === 'action') html += '<b class="act">' + esc(sg.v.replace(/:.*$/, '').replace(/\?$/, '')) + '</b>';
      else if (sg.t === 'comp') {
        if (sg.hidden) continue;
        const c = sg.c;
        if (c.kind === 'ing' && c.mods.includes('&')) {
          const q = c.qtyRaw && c.qtyRaw.trim() ? fmtQty(c.qtyRaw) + ' ' : '';
          html += '<i class="prod">' + esc(q + c.display) + '</i>';
        } else if (c.kind === 'ing' && !c.name) html += esc(fmtQty(c.qtyRaw));
        else if (c.kind === 'timer') {
          const label = compLabel(c);
          // a condition to wait for (`~{golden}`) wraps like prose; a duration does not
          html += '<span class="' + (/\d/.test(label) ? 'tm' : 'cond') + '">' + esc(label) + '</span>';
        }
        else html += '<span class="' + (c.kind === 'cw' ? 'cw' : 'ing') + '">' + esc(c.display) + '</span>';
      } else if (sg.t === 'group') {
        if (!sg.chosen) continue;
        const c = sg.chosen;
        html += '<span class="' + (c.kind === 'cw' ? 'cw' : 'ing') + '">' + esc(c.kind === 'timer' ? compLabel(c) : c.bracket ? c.name : (c.display || c.name)) + '</span>';
      }
    }
    return html.replace(/\s*\n\s*/g, ' ').trim();
  }

  function leafHTML(c) {
    const q = c.qtyRaw ? fmtQty(c.qtyRaw) : '';
    let h = '';
    if (q) h += '<span class="q">' + esc(q) + '</span> ';
    h += '<span class="n">' + esc(c.recipe ? c.display : c.display) + '</span>';
    if (c.recipe) h += ' <span class="tag">recipe</span>';
    if (c.mods.includes('?')) h += ' <span class="tag">optional</span>';
    if (c.mods.includes('-')) h += ' <span class="tag">not listed</span>';
    if (c.alts && c.alts.length) h += ' <sup class="alt" title="has substitutes">†</sup>';
    if (c.note) h += ' <span class="note">' + esc(c.note) + '</span>';
    return h;
  }

  function namesHTML(names) {
    if (!names || !names.length) return '';
    return names.map(n => (n.qty ? esc(fmtQty(n.qty)) + ' ' : '') + esc(n.name)).join(' + ');
  }

  function productTag(node) {
    const ps = node.products.length ? node.products : node.sectionProduct ? [node.sectionProduct] : [];
    if (!ps.length) return '';
    return '<div class="makes">→ ' + ps.map(p => '<i>' + esc(p.name) + '</i>' + (p.qtyRaw ? ' ' + esc(fmtQty(p.qtyRaw)) : '')).join(' + ') + '</div>';
  }

  function stepCellHTML(node, extraCls, place, hue, light, edge) {
    const title = esc(node.raw.replace(/\s+/g, ' '));
    return '<div class="cell step ' + extraCls + '" style="' + place + ';--h:' + hue + ';--l:' + light + '%" title="' + title + '">' +
      '<div class="txt"><span class="no">' + (node.index + 1) + '</span>' + stepTextHTML(node) + productTag(node) + (edge || '') + '</div>' +
      (extraCls.includes('spine') ? '' : '<div class="chev"></div>') + '</div>';
  }

  function chartHTML(chart, ctx, opts) {
    const D = chart.depth;
    const spineCol = D + 2;
    const cells = [];
    let r = 1;
    const leafLight = rowIdx => 76 + (rowIdx % 2) * 5;

    const place = (item, parentCol, row) => {
      if (item.kind === 'step') {
        const col = parentCol - 1;
        const kidsStart = row;
        let rr = row;
        for (const k of item.kids) { place(k, col, rr); rr += k.rows; }
        const pl = 'grid-column:' + col + ';grid-row:' + kidsStart + ' / span ' + item.rows;
        const edge = item.names && item.names.length && !item.node.products.length && !item.node.sectionProduct
          ? '<div class="makes">→ <i>' + namesHTML(item.names) + '</i></div>' : '';
        cells.push(stepCellHTML(item.node, 'branch', pl, item.hue, 60, edge));
        return;
      }
      const pl = 'grid-column:1 / ' + parentCol + ';grid-row:' + row;
      if (item.kind === 'leaf') {
        cells.push('<div class="cell leaf" style="' + pl + ';--h:' + item.hue + ';--l:' + leafLight(row) + '%"><div class="txt">' + leafHTML(item.comp) + '</div><div class="chev"></div></div>');
      } else if (item.kind === 'missing') {
        cells.push('<div class="cell leaf missing" style="' + pl + '"><div class="txt"><span class="n">' + esc(item.comp.display) + '</span> <span class="tag">not found</span></div><div class="chev"></div></div>');
      } else if (item.kind === 'ref') {
        const where = item.node.onSpine ? 'step ' + (item.node.index + 1) : 'step ' + (item.node.index + 1);
        cells.push('<div class="cell leaf ref" style="' + pl + ';--h:' + item.hue + ';--l:' + leafLight(row) + '%"><div class="txt"><i class="n">' +
          (namesHTML(item.names) || 'the result') + '</i> <span class="from">from ' + where + '</span></div><div class="chev"></div></div>');
      }
    };

    chart.bands.forEach((band, k) => {
      const n = band.node;
      let rr = r;
      for (const it of band.items) { place(it, spineCol, rr); rr += it.rows; }
      const light = n.hue === SPINE_HUE ? Math.max(30, 50 - (n.spinePos / Math.max(1, n.spineLen - 1)) * 16) : 60;
      const pl = 'grid-column:' + spineCol + ';grid-row:' + r + ' / span ' + band.rows;
      cells.push(stepCellHTML(n, 'spine' + (n.hue === SPINE_HUE ? ' ink' : ''), pl, n.hue, light));
      r += band.rows;
      if (k < chart.bands.length - 1) {
        const next = chart.bands[k + 1];
        const lbl = next.carried ? namesHTML(next.carried.names) : '';
        const cl = Math.max(26, light - 8);
        cells.push('<div class="cell conn' + (cl < 50 ? ' dark' : '') + '" style="grid-column:' + spineCol + ';grid-row:' + r + ';--h:' + (n.hue) + ';--l:' + cl + '%"><div class="down"></div>' + (lbl ? '<i class="clbl">' + lbl + '</i>' : '') + '</div>');
        r += 1;
      }
    });
    if (opts.yieldText != null) {
      cells.push('<div class="cell yield" style="grid-column:' + spineCol + ';grid-row:' + r + '"><div class="arrow"><span>' + opts.yieldText + '</span></div></div>');
      r += 1;
    }
    const cols = 'minmax(150px,1.25fr) ' + (D ? 'repeat(' + D + ', minmax(128px,1fr)) ' : '') + 'minmax(190px,1.35fr)';
    const minW = 150 + D * 128 + 190;
    return '<div class="chart" style="grid-template-columns:' + cols + ';min-width:' + minW + 'px">' + cells.join('') + '</div>';
  }

  function yieldText(meta) {
    const bits = [];
    if (meta.makes) bits.push('Makes ' + esc(meta.makes));
    if (meta.yield) bits.push(esc(fmtQty(String(meta.yield))));
    if (meta.servings) bits.push('Serves ' + esc(meta.servings));
    return bits.length ? bits.join('<br>') : 'Serve';
  }

  function renderHTML(a) {
    const ctx = { placed: new Set(), lc: new Map(), ht: new Map(), h: 0, nextHue() { return HUES[this.h++ % HUES.length]; } };
    const parts = [];
    const g = a.graph;
    if (g.setup.length) {
      parts.push('<div class="setup">' + g.setup.map(s => '<div class="setup-row"><span class="no">' + (s.index + 1) + '</span>' + stepTextHTML(s) + '</div>').join('') + '</div>');
    }
    let main = null;
    if (g.root) {
      main = layoutChart(g.root, ctx);
      parts.push('<div class="chart-wrap">' + chartHTML(main, ctx, { yieldText: yieldText(a.meta) }) + '</div>');
    }
    // steps that feed nothing: their own small charts (rule 20 by-products)
    const extras = [];
    for (const s of g.sinks) {
      if (ctx.placed.has(s)) continue;
      const ch = layoutChart(s, ctx);
      const ps = s.products.length ? s.products.map(p => p.name).join(' + ') : s.sectionProduct ? s.sectionProduct.name : 'unused result';
      extras.push('<div class="extra"><h3>Also makes: <i>' + esc(ps) + '</i></h3><div class="chart-wrap">' + chartHTML(ch, ctx, { yieldText: esc(ps) }) + '</div></div>');
    }
    // any active step still not drawn (should not happen; reported if it does)
    const missed = g.live.filter(s => !ctx.placed.has(s));
    for (const s of missed) a.reports.push({ level: 'error', msg: 'Step ' + (s.index + 1) + ' was not drawn.', step: s });
    return { html: parts.join('') + extras.join(''), analysis: a, chart: main, placedCount: ctx.placed.size, missed };
  }

  const api = { renderHTML, fmtQty, slug: n => n.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CookDag = api;
})(typeof window !== 'undefined' ? window : this);
