/*
 * adapter.js — turns what the parser returns (`Parser.parse_spec2`, from the
 * spec-2.0 branch of cooklang-rs, as JSON) into the steps, inputs and boxes
 * the chart draws. The graph itself comes from the parser and follows the
 * proposal text; the drawing choices marked RENDERER are made here.
 *
 * Pure: no DOM. Runs in the browser (window.CookAdapter) and under node.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- quantities
  const VULGAR = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/8': '⅛', '3/8': '⅜', '1/5': '⅕' };
  const DEC = { 0.5: '½', 0.25: '¼', 0.75: '¾', 0.125: '⅛' };

  function num(n) {
    if (!n) return '';
    if (n.type === 'fraction') {
      const { whole, num: a, den } = n.value;
      const f = VULGAR[a + '/' + den] || (a ? a + '/' + den : '');
      return whole ? (f ? whole + ' ' + f : String(whole)) : f || '0';
    }
    const v = n.value;
    const whole = Math.trunc(v);
    const frac = Math.round((v - whole) * 1000) / 1000;
    if (frac && DEC[frac]) return (whole ? whole + ' ' : '') + DEC[frac];
    return String(Math.round(v * 1000) / 1000);
  }

  function value(v) {
    if (!v) return '';
    if (v.type === 'number') return num(v.value);
    if (v.type === 'range') return num(v.value.start) + '–' + num(v.value.end);
    return String(v.value);
  }

  // "1 ½ cup"; dual units "4 oz (115 g)"
  function qty(q) {
    if (!q) return '';
    const val = value(q.value);
    if (!q.unit) return val;
    const [first, ...more] = q.unit.split('|');
    const alt = more.map(m => m.replace('%', ' ')).join(', ');
    return (val + ' ' + first).trim() + (alt ? ' (' + alt + ')' : '');
  }

  function isCount(q) {
    return q && !q.unit && q.value && q.value.type === 'number';
  }

  // ---------------------------------------------------------------- components
  function modsOf(i) {
    const m = i.modifiers || '';
    return (m.includes('REF') ? '&' : '') + (m.includes('OPT') ? '?' : '') + (m.includes('HIDDEN') ? '-' : '') + (m.includes('NEW') ? '+' : '');
  }

  function ingredientComp(r, index) {
    const i = r.ingredients[index];
    const name = i.name || '';
    const display = i.reference ? i.reference.name : name.split(':')[0].trim();
    return {
      kind: 'ing', index, name, display, key: name.split(':').pop().trim().toLowerCase(),
      mods: modsOf(i), qtyRaw: qty(i.quantity), quantity: i.quantity, note: i.note || '',
      recipe: !!i.reference, nameless: !name,
    };
  }

  function cookwareComp(r, index) {
    const c = r.cookware[index];
    return { kind: 'cw', index, name: c.name, display: c.name.split(':')[0].trim(), mods: modsOf(c), qtyRaw: qty(c.quantity), note: c.note || '' };
  }

  function timerComp(r, index) {
    const t = r.timers[index];
    return { kind: 'timer', index, name: t.name || '', display: t.name || '', mods: '', qtyRaw: qty(t.quantity) };
  }

  function itemComp(r, it) {
    if (it.type === 'ingredient') return ingredientComp(r, it.index);
    if (it.type === 'cookware') return cookwareComp(r, it.index);
    if (it.type === 'timer') return timerComp(r, it.index);
    return null;
  }

  // ---------------------------------------------------------------- analyse
  function analyse(json) {
    const out = typeof json === 'string' ? JSON.parse(json) : json;
    const r = out.recipe;
    const g = out.graph;
    const reports = [];
    for (const d of out.diagnostics || []) {
      // the graph reports a use with nothing before it itself
      if (/^Nothing called/.test(d.message)) continue;
      const level = d.level === 'error' ? 'error' : 'warn';
      const same = reports.find(x => x.parser && x.level === level && x.base === d.message);
      if (same) { same.count++; same.msg = same.base + ' (' + same.count + ' times)'; continue; }
      reports.push({ level, msg: d.message, base: d.message, count: 1, parser: true });
    }
    if (!r || !g) return { meta: {}, labels: { choices: [], toggles: [] }, active: { current: {}, toggles: {} }, sections: [], steps: [], graph: emptyGraph(), reports, subs: [] };

    const meta = (r.raw_metadata && r.raw_metadata.map) || {};
    const subs = [];
    const sections = r.sections.map(s => ({ name: s.name || '', notes: [], list: (s.attributes || []).some(a => a.trim().toLowerCase() === 'list') }));
    r.sections.forEach((s, si) => s.content.forEach(c => { if (c.type === 'text') sections[si].notes.push(c.value); }));

    // one object per step, in file order
    const steps = g.steps.map((gs, index) => {
      const content = r.sections[gs.section].content[gs.content].value;
      const st = { index, id: 's' + index, section: sections[gs.section], active: gs.active, list: gs.list,
        inputs: [], consumers: [], actions: [], segs: [], comps: [], products: [], raw: '' };
      let groupNo = 0;
      const textParts = [];
      for (const it of content.items) {
        if (it.type === 'text') { st.segs.push({ t: 'text', v: it.value }); textParts.push(it.value); continue; }
        if (it.type === 'action') { st.segs.push({ t: 'action', v: it.value }); st.actions.push(it.value); textParts.push(it.value); continue; }
        if (it.type === 'inlineQuantity') { const q = qty(r.inline_quantities[it.index]); st.segs.push({ t: 'text', v: q }); textParts.push(q); continue; }
        if (it.type === 'group') {
          const chosenIdx = gs.chosen[groupNo++];
          const opts = it.options.map(o => {
            const comps = o.items.map(x => itemComp(r, x)).filter(Boolean);
            const first = comps[0] || {};
            return { bracket: comps.length > 1, comps, kind: first.kind, display: first.display, name: comps.map(c => c.display).join(' + '),
              qtyRaw: first.qtyRaw, label: o.label, reason: o.reason };
          });
          // rule 4: an option with no amount takes the first option's
          const lead = opts[0];
          for (const o of opts.slice(1)) {
            if (!o.bracket && !lead.bracket && !o.qtyRaw && lead.qtyRaw) { o.qtyRaw = lead.qtyRaw; o.inheritedQty = true; o.comps[0].qtyRaw = lead.qtyRaw; }
          }
          const chosen = chosenIdx == null ? null : opts[chosenIdx];
          st.segs.push({ t: 'group', opts, chosen });
          if (chosen) {
            textParts.push(chosen.name);
            const others = opts.filter(o => o !== chosen);
            chosen.comps.forEach(c => { c.alts = others; });
            if (opts.length > 1 && st.active) subs.push({ kind: 'group', chosen, others, groupKind: lead.kind });
          }
          continue;
        }
        const c = itemComp(r, it);
        if (!c) continue;
        st.segs.push({ t: 'comp', c });
        textParts.push(c.kind === 'timer' ? (c.qtyRaw || c.display) : c.nameless ? c.qtyRaw : c.display);
        if (c.kind === 'ing' && c.mods.includes('?') && st.active) subs.push({ kind: 'optional', name: c.display, note: c.note });
      }
      st.raw = textParts.join('').replace(/\s+/g, ' ').trim();
      st.products = (content.products || []).map(p => ({ name: r.products[p].name, qtyRaw: qty(r.products[p].quantity), quantity: r.products[p].quantity }));
      if (gs.section_product != null) {
        const p = r.products[gs.section_product];
        st.sectionProduct = { name: p.name, qtyRaw: qty(p.quantity) };
      }
      return st;
    });

    // inputs, from the parser's graph
    g.steps.forEach((gs, k) => {
      const st = steps[k];
      for (const inp of gs.inputs) {
        if (inp.type === 'ingredient') st.inputs.push({ type: 'leaf', comp: ingredientComp(r, inp.ingredient), fromList: inp.from_list });
        else if (inp.type === 'missing') st.inputs.push({ type: 'missing', comp: ingredientComp(r, inp.ingredient) });
        else st.inputs.push({ type: 'step', from: steps[inp.from], carry: inp.carry,
          names: inp.uses.map(u => ({ name: u.name, qty: qty(u.quantity), ingredientRef: u.ingredient_ref }))
            .filter((n, i, all) => all.findIndex(m => m.name.toLowerCase() === n.name.toLowerCase() && m.qty === n.qty) === i) });
      }
    });

    for (const rp of g.reports) {
      reports.push({ level: rp.level === 'info' ? 'info' : rp.level === 'error' ? 'error' : 'warn', rule: rp.rule, msg: rp.message.replace(/'([^']+)'/g, '“$1”'), step: rp.step == null ? null : steps[rp.step] });
    }

    const live = steps.filter(s => s.active && !s.list);
    applyRendererChoices(live, reports);
    for (const s of live) s.consumers = [];
    for (const s of live) for (const i of s.inputs) if (i.type === 'step') i.from.consumers.push(s);

    const rootStep = g.root == null ? null : steps[g.root];
    const alsoMakes = g.by_products
      // RENDERER: a repeated action (`Add ×` the @&stock{1%ladle}) works through the whole product
      .filter(b => !(b.kind === 'rest' && b.used_by.some(k => steps[k].actions.some(a => a.includes('×')))))
      .map(b => ({ key: b.name.toLowerCase(), name: b.name, qty: qty(b.quantity), node: steps[b.step],
        kind: b.kind, left: b.left, uses: b.used.map(u => ({ qty: qty(u.quantity) })) }));
    const setup = live.filter(s => s.setup);
    const drawn = live.filter(s => !s.setup);
    const sinks = drawn.filter(s => s !== rootStep && s.consumers.length === 0);

    const labels = {
      choices: g.labels.choices.map(c => ({ name: c.name, options: c.options, descs: c.descriptions.map(d => d || '') })),
      toggles: g.labels.toggles,
    };
    return {
      meta, labels, active: { current: g.path.current, toggles: g.path.toggles },
      sections, steps,
      graph: { live: drawn, root: rootStep && !rootStep.setup ? rootStep : drawn[drawn.length - 1] || null, sinks, alsoMakes, setup },
      reports, subs: dedupeSubs(subs),
    };
  }

  // Drawing choices that are not in any proposal.
  function applyRendererChoices(live, reports) {
    const bySection = new Map();
    for (const s of live) {
      if (!bySection.has(s.section)) bySection.set(s.section, []);
      bySection.get(s.section).push(s);
    }
    // RENDERER (as Cooking-for-Engineers tables do): a step with nothing going
    // in at the start of a line (grease the tin, preheat the oven) sits above
    // the chart, and nothing carries on from it.
    for (const list of bySection.values()) {
      const ownInputs = s => s.inputs.some(i => i.type !== 'step' || !i.carry);
      list.forEach((s, n) => {
        const prev = list[n - 1];
        const startsLine = !prev || prev.setup;
        if (startsLine && !ownInputs(s) && list.slice(n + 1).some(ownInputs)) s.setup = true;
        else if (startsLine && !ownInputs(s) && !s.setup) {
          reports.push({ level: 'info', rule: 9, msg: `Step ${s.index + 1} starts ${s.section.name ? '“' + s.section.name + '”' : 'the recipe'} and takes nothing in, so nothing before it feeds it. If it works on something made earlier, name it with @&name{}.`, step: s });
        }
      });
      for (const s of list) {
        if (s.setup) continue;
        s.inputs = s.inputs.filter(i => !(i.type === 'step' && i.from.setup && i.carry && !i.names.length));
      }
    }
    // RENDERER: a product handed on to the step that used it (rule 8) follows
    // the line of steps that carry on from there, as rule 23 does for ingredients.
    const carryNext = new Map();
    for (const s of live) for (const i of s.inputs) if (i.type === 'step' && i.carry) carryNext.set(i.from, s);
    const lineEnd = (from, cur) => {
      while (carryNext.has(from) && carryNext.get(from) !== cur && carryNext.get(from).index < cur.index) from = carryNext.get(from);
      return from;
    };
    for (const s of live) {
      const merged = [];
      for (const i of s.inputs) {
        if (i.type === 'step' && !i.carry && i.names.length && i.names.every(n => !n.ingredientRef)) {
          const to = lineEnd(i.from, s);
          if (to !== i.from && to !== s) {
            const other = merged.find(m => m.type === 'step' && m.from === to);
            if (other) { other.names.push(...i.names); continue; }
            i.from = to;
          }
        }
        merged.push(i);
      }
      s.inputs = merged;
    }
  }

  function dedupeSubs(subs) {
    const seen = new Set();
    return subs.filter(s => {
      const k = s.kind + ':' + (s.kind === 'group' ? s.chosen.name + '|' + s.others.map(o => o.name).join('|') : s.name);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function emptyGraph() { return { live: [], root: null, sinks: [], alsoMakes: [], setup: [] }; }

  const api = { analyse, qty, isCount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CookAdapter = api;
})(typeof window !== 'undefined' ? window : this);
