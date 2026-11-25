/*
 * REFERENCE ONLY: the first, regex-based reading of the syntax, kept so that
 * test/parity.js can compare the cooklang-rs parser's graphs against it.
 * The page does not load this file.
 *
 * dag-core.js — a demo renderer for the recipe graph of Cooklang spec
 * proposal 0027 (products: `-> name`, `@&name{}`; cooklang/spec#165),
 * with step actions (proposal 0029, cooklang/spec#167) as cell labels and
 * alternatives + labels (proposal 0025, cooklang/spec#162) as the
 * substitutions box and the choice pickers.
 *
 * Pure: no DOM. `analyse(src, selection)` returns the parsed recipe and its
 * graph; `renderHTML(src, selection)` returns the drawing as an HTML string.
 * Runs in the browser (window.CookDag) and under node (module.exports).
 *
 * Renderer choices that are not in any proposal are marked RENDERER.
 */
(function (root) {
  'use strict';

  const LABEL_BODY = '[\\p{L}\\p{N}][\\p{L}\\p{N}-]*(?:=[\\p{L}\\p{N}][\\p{L}\\p{N}-]*)?';
  const LABEL_AT = new RegExp('^\\?(' + LABEL_BODY + ')', 'u');

  // ---------------------------------------------------------------- front matter
  function parseFrontMatter(src) {
    const m = src.match(/^---\n([\s\S]*?)\n---[ \t]*\n?/);
    if (!m) return { meta: {}, body: src };
    return { meta: parseYaml(m[1]), body: src.slice(m[0].length) };
  }

  function parseYaml(text) {
    const rootObj = {};
    const stack = [{ indent: -1, obj: rootObj, parent: null, key: null }];
    for (const raw of text.split('\n')) {
      if (!raw.trim() || raw.trim().startsWith('#')) continue;
      const indent = raw.match(/^ */)[0].length;
      const line = raw.trim();
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const top = stack[stack.length - 1];
      if (line.startsWith('- ')) {
        if (!Array.isArray(top.obj) && top.parent) {
          const arr = [];
          top.parent[top.key] = arr;
          top.obj = arr;
        }
        if (Array.isArray(top.obj)) top.obj.push(scalar(line.slice(2).trim()));
        continue;
      }
      const mm = line.match(/^([^:]+):\s*(.*)$/);
      if (!mm || Array.isArray(top.obj)) continue;
      const key = mm[1].trim();
      const v = mm[2].trim();
      if (v === '') {
        const o = {};
        top.obj[key] = o;
        stack.push({ indent, obj: o, parent: top.obj, key });
      } else top.obj[key] = scalar(v);
    }
    return rootObj;
  }

  function scalar(v) {
    if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    return v.replace(/^["'](.*)["']$/, '$1');
  }

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

  function isCountOnly(raw) {
    return raw != null && /^\s*=?\s*[\d./\s-]+\s*$/.test(raw) && raw.trim() !== '';
  }

  // ---------------------------------------------------------------- tokenizer
  function readName(s, j) {
    // multi-word name: up to "{" if it comes before a stop character
    let k = j;
    while (k < s.length) {
      const ch = s[k];
      if (ch === '{') return { name: s.slice(j, k), end: k };
      if ('@#~\n`}'.includes(ch)) break;
      if (ch === '|' && /[@#{(~]/.test(s[k + 1] || '')) break;
      k++;
    }
    const m = s.slice(j).match(/^[\p{L}\p{N}_'’][\p{L}\p{N}_'’-]*/u);
    if (!m) return null;
    let name = m[0].replace(/[-'’]+$/, '');
    return { name, end: j + name.length };
  }

  function parseComp(s, i) {
    const sig = s[i];
    const c = { kind: sig === '@' ? 'ing' : sig === '#' ? 'cw' : 'timer', mods: '', name: '', display: '' };
    let j = i + 1;
    if (sig !== '~') {
      while (j < s.length && '?&-+'.includes(s[j])) c.mods += s[j++];
      if (c.mods.includes('&')) {
        const r = s.slice(j).match(/^\(=?~?\d+\)/);
        if (r) j += r[0].length;
      }
    }
    if (s[j] !== '{') {
      const n = readName(s, j);
      if (!n || !n.name.trim()) return null;
      c.name = n.name.trim();
      j = n.end;
    }
    if (s[j] === '{') {
      const e = s.indexOf('}', j);
      if (e < 0) return null;
      c.qtyRaw = s.slice(j + 1, e);
      c.braces = true;
      j = e + 1;
    } else if (!c.name) return null;
    if (c.kind !== 'timer' && s[j] === '(') {
      const e = s.indexOf(')', j);
      if (e > 0 && !s.slice(j, e).includes('\n\n')) {
        c.note = s.slice(j + 1, e).trim();
        j = e + 1;
      }
    }
    const lm = s.slice(j).match(LABEL_AT);
    if (lm) {
      c.label = lm[1].toLowerCase();
      j += lm[0].length;
    }
    if (s[j] === '[') {
      const e = s.indexOf(']', j);
      if (e > 0) {
        c._reason = s.slice(j + 1, e).replace(/\s+/g, ' ').trim();
        c._reasonEnd = e + 1;
      }
    }
    // names: "as written:canonical"; recipe references "./path"
    if (c.name.startsWith('./')) {
      c.recipe = true;
      c.display = c.name.split('/').pop();
      c.key = c.name.toLowerCase();
    } else {
      const ci = c.name.indexOf(':');
      c.display = ci > 0 ? c.name.slice(0, ci).trim() : c.name;
      c.key = (ci > 0 ? c.name.slice(ci + 1) : c.name).trim().toLowerCase();
    }
    c.end = j;
    return c;
  }

  function finishReason(c, keep) {
    if (keep && c._reason != null) {
      c.reason = c._reason;
      c.end = c._reasonEnd;
    }
    delete c._reason;
    delete c._reasonEnd;
  }

  // "(@a{} + @b{})" bracket option
  function parseBracket(s, i) {
    let j = i + 1;
    const comps = [];
    for (;;) {
      while (s[j] === ' ' || s[j] === '\t') j++;
      if (!'@#'.includes(s[j])) return null;
      const c = parseComp(s, j);
      if (!c) return null;
      finishReason(c, false);
      comps.push(c);
      j = c.end;
      while (s[j] === ' ' || s[j] === '\t') j++;
      if (s[j] === '+') { j++; continue; }
      if (s[j] === ')') { j++; break; }
      return null;
    }
    if (comps.length < 2) return null;
    const opt = { bracket: true, comps, kind: 'ing', name: comps.map(c => c.display).join(' + ') };
    const lm = s.slice(j).match(LABEL_AT);
    if (lm) { opt.label = lm[1].toLowerCase(); j += lm[0].length; }
    if (s[j] === '[') {
      const e = s.indexOf(']', j);
      if (e > 0) { opt.reason = s.slice(j + 1, e).trim(); j = e + 1; }
    }
    opt.end = j;
    return opt;
  }

  const PIPE_AHEAD = /^[ \t]*\n?[ \t]*\|[ \t]*\n?[ \t]*(?=[@#~{(])/;

  function parseOption(s, j, first) {
    if (s[j] === '(') return parseBracket(s, j);
    if (s[j] === '{') {
      // name taken from the first option: "|{300%g}"
      const e = s.indexOf('}', j);
      if (e < 0) return null;
      const c = { kind: first.kind, mods: '', name: first.name, display: first.display, key: first.key,
        qtyRaw: s.slice(j + 1, e), braces: true, inheritedName: true };
      let k = e + 1;
      const lm = s.slice(k).match(LABEL_AT);
      if (lm) { c.label = lm[1].toLowerCase(); k += lm[0].length; }
      c.end = k;
      return c;
    }
    const c = parseComp(s, j);
    if (!c) return null;
    finishReason(c, true);
    return c;
  }

  // Split step text into segments: text, action, comp, group.
  function tokenize(s) {
    const segs = [];
    let buf = '';
    let i = 0;
    const flush = () => { if (buf) { segs.push({ t: 'text', v: buf }); buf = ''; } };
    while (i < s.length) {
      const ch = s[i];
      if (ch === '\\' && s[i + 1] === '`') { buf += '`'; i += 2; continue; }
      if (ch === '`') {
        const e = s.indexOf('`', i + 1);
        const inner = e > 0 ? s.slice(i + 1, e) : '';
        if (e > 0 && inner.trim() && !inner.includes('\n') && !/[@#~]/.test(inner)) {
          flush();
          segs.push({ t: 'action', v: inner.trim() });
          i = e + 1;
          continue;
        }
      }
      let first = null;
      if ('@#~'.includes(ch)) first = parseComp(s, i);
      else if (ch === '(' ) {
        const b = parseBracket(s, i);
        if (b && PIPE_AHEAD.test(s.slice(b.end))) first = b;
      }
      if (first) {
        const opts = [first];
        let j = first.end;
        for (;;) {
          const pm = s.slice(j).match(PIPE_AHEAD);
          if (!pm) break;
          const o = parseOption(s, j + pm[0].length, opts[0]);
          if (!o) break;
          opts.push(o);
          j = o.end;
        }
        if (!first.bracket) finishReason(first, opts.length > 1 || !!first.label);
        if (opts.length === 1 && !first.bracket) j = first.end;
        flush();
        if (opts.length > 1) segs.push({ t: 'group', opts });
        else if (first.bracket) { buf += ch; i++; continue; }
        else segs.push({ t: 'comp', c: first });
        i = j;
        continue;
      }
      buf += ch;
      i++;
    }
    flush();
    return segs;
  }

  // ---------------------------------------------------------------- blocks
  function lastArrow(t) {
    let idx = -1;
    let from = 0;
    for (;;) {
      const k = t.indexOf('->', from);
      if (k < 0) break;
      if (k > 0 && /\s/.test(t[k - 1])) idx = k;
      from = k + 2;
    }
    return idx;
  }

  function parseTail(str) {
    str = str.trim();
    if (!str || str.startsWith('#')) return { location: str || null, products: [] };
    const products = str.split(/\s\+\s/).map(p => {
      const m = p.trim().match(/^(.*?)(?:\{([^}]*)\})?\s*$/);
      return { name: m[1].trim(), key: m[1].trim().toLowerCase(), qtyRaw: m[2] };
    }).filter(p => p.name);
    return { products };
  }

  function parseSectionLine(line) {
    let t = line.trim().replace(/^=+/, '').replace(/=+\s*$/, '').trim();
    let products = [];
    const ai = lastArrow(' ' + t);
    if (ai >= 0) {
      products = parseTail(t.slice(ai + 1)).products;
      t = t.slice(0, ai - 1).trim();
    }
    const attrs = [];
    t = t.replace(/\[([^\]]*)\]/g, (m, a) => { attrs.push(a.trim().toLowerCase()); return ''; });
    let anchor = null;
    t = t.replace(/~\{([^}]*)\}/g, (m, a) => { anchor = a; return ''; });
    let label = null;
    const lm = t.match(new RegExp('(?:^|\\s)\\?(' + LABEL_BODY + ')\\s*$', 'u'));
    if (lm) { label = lm[1].toLowerCase(); t = t.slice(0, lm.index); }
    return { name: t.trim(), product: products[0] || null, extraProducts: products.slice(1),
      list: attrs.includes('list'), label, anchor };
  }

  function splitBlocks(body) {
    body = body.replace(/\[-[\s\S]*?-\]/g, '');
    const out = [];
    let cur = null;
    let inList = false;
    const end = () => { if (cur) { out.push({ type: 'step', text: cur.join('\n') }); cur = null; } };
    for (let line of body.split('\n')) {
      line = line.replace(/(^|\s)--(?!-).*$/, '$1').replace(/\s+$/, '');
      if (!line.trim()) { end(); continue; }
      if (/^\s*=/.test(line)) {
        end();
        const sec = parseSectionLine(line);
        inList = sec.list;
        out.push({ type: 'section', sec });
        continue;
      }
      if (/^\s*>/.test(line)) { end(); out.push({ type: 'note', text: line.replace(/^\s*>\s?/, '') }); continue; }
      if (inList) { out.push({ type: 'listline', text: line.trim() }); continue; }
      (cur = cur || []).push(line);
    }
    end();
    return out;
  }

  // ---------------------------------------------------------------- labels
  function collectLabels(meta, body) {
    const choices = new Map();
    const descs = {};
    if (meta.choices && typeof meta.choices === 'object') {
      for (const [c, opts] of Object.entries(meta.choices)) {
        let list = [];
        if (Array.isArray(opts)) list = opts.map(String);
        else if (opts && typeof opts === 'object') {
          for (const [o, d] of Object.entries(opts)) {
            list.push(o);
            descs[c.toLowerCase() + '=' + o.toLowerCase()] = typeof d === 'string' ? d : (d && d.description) || '';
          }
        }
        choices.set(c.toLowerCase(), list.map(o => o.toLowerCase()));
      }
    }
    const re = new RegExp('(?<![@#\\p{L}\\p{N}_])\\?(' + LABEL_BODY + ')', 'gu');
    const found = [...body.replace(/^>.*$/gm, '').matchAll(re)].map(m => m[1].toLowerCase());
    for (const l of found) {
      if (!l.includes('=')) continue;
      const [c, o] = l.split('=');
      if (!choices.has(c)) choices.set(c, []);
      if (!choices.get(c).includes(o)) choices.get(c).push(o);
    }
    const toggles = [];
    for (const l of found) {
      if (l.includes('=')) continue;
      if ([...choices.values()].some(opts => opts.includes(l))) continue;
      if (!toggles.includes(l)) toggles.push(l);
    }
    return { choices: [...choices.entries()].map(([name, options]) => ({ name, options, descs: options.map(o => descs[name + '=' + o] || '') })), toggles };
  }

  function makeActive(labels, sel) {
    sel = sel || {};
    const cur = {};
    for (const ch of labels.choices) {
      const want = sel.choices && sel.choices[ch.name];
      cur[ch.name] = ch.options.includes(want) ? want : ch.options[0];
    }
    const tog = {};
    for (const t of labels.toggles) tog[t] = !!(sel.toggles && sel.toggles[t]);
    const isActive = l => {
      if (!l) return true;
      if (l.includes('=')) { const [c, o] = l.split('='); return cur[c] === o; }
      for (const ch of labels.choices) if (ch.options.includes(l)) return cur[ch.name] === l;
      return !!tog[l];
    };
    return { isActive, current: cur, toggles: tog };
  }

  // ---------------------------------------------------------------- analyse
  function analyse(src, selection) {
    const { meta, body } = parseFrontMatter(src.replace(/\r\n?/g, '\n'));
    const labels = collectLabels(meta, body);
    const act = makeActive(labels, selection);
    const reports = [];
    const subs = [];
    const sections = [];
    const steps = [];
    let sec = null;
    const ensureSec = () => {
      if (!sec) { sec = { name: '', implicit: true, steps: [], listItems: [], notes: [], active: true }; sections.push(sec); }
      return sec;
    };

    for (const b of splitBlocks(body)) {
      if (b.type === 'section') {
        sec = Object.assign({ steps: [], listItems: [], notes: [] }, b.sec);
        sec.active = act.isActive(sec.label);
        sections.push(sec);
      } else if (b.type === 'note') {
        ensureSec().notes.push(b.text);
      } else if (b.type === 'listline') {
        const s = ensureSec();
        const comps = activeComps(tokenize(b.text), act, subs);
        if (s.active) s.listItems.push(...comps.filter(c => c.kind === 'ing'));
      } else {
        const s = ensureSec();
        const lm = b.text.match(new RegExp('^\\?(' + LABEL_BODY + '):', 'u'));
        const on = s.active && act.isActive(lm ? lm[1].toLowerCase() : null);
        const st = parseStep(b.text, act, on ? subs : []);
        st.section = s;
        st.index = steps.length;
        st.active = on;
        s.steps.push(st);
        steps.push(st);
      }
    }

    const graph = buildGraph(sections, steps, reports);
    return { meta, labels, active: act, sections, steps, graph, reports, subs: dedupeSubs(subs) };
  }

  function parseStep(text, act, subs) {
    const st = { raw: text, products: [], inputs: [], consumers: [] };
    const lm = text.match(new RegExp('^\\?(' + LABEL_BODY + '):\\s*', 'u'));
    if (lm) { st.label = lm[1].toLowerCase(); text = text.slice(lm[0].length); }
    const ai = lastArrow(text);
    if (ai >= 0) {
      const tail = parseTail(text.slice(ai + 2));
      st.products = tail.products;
      st.location = tail.location;
      text = text.slice(0, ai).replace(/\s+$/, '');
    }
    st.segs = tokenize(text);
    st.comps = activeComps(st.segs, act, subs);
    st.actions = st.segs.filter(s => s.t === 'action').map(s => s.v);
    return st;
  }

  // Resolve groups and labels to the components on the chosen path.
  function activeComps(segs, act, subs) {
    const out = [];
    for (const sg of segs) {
      if (sg.t === 'comp') {
        if (sg.c.label && !act.isActive(sg.c.label)) { sg.hidden = true; continue; }
        if (sg.c.mods.includes('?') && sg.c.kind === 'ing') subs.push({ kind: 'optional', name: sg.c.display, note: sg.c.note });
        out.push(sg.c);
      } else if (sg.t === 'group') {
        const opts = sg.opts;
        const first = opts[0];
        for (const o of opts.slice(1)) {
          if (!o.bracket && !first.bracket && (!o.braces || !o.qtyRaw) && !o.inheritedName) o.qtyRaw = first.qtyRaw, o.inheritedQty = true;
        }
        let chosen = opts.find(o => o.label && act.isActive(o.label));
        if (!chosen) chosen = opts.find(o => !o.label);
        sg.chosen = chosen || null;
        if (!chosen) continue;
        const others = opts.filter(o => o !== chosen);
        const comps = chosen.bracket ? chosen.comps : [chosen];
        comps.forEach(c => { c.alts = others; c.groupReason = chosen.reason; });
        out.push(...comps);
        subs.push({ kind: 'group', chosen, others, groupKind: first.kind });
      }
    }
    return out;
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

  // ---------------------------------------------------------------- graph (spec 0027 rules)
  function buildGraph(sections, steps, reports) {
    const names = new Map();        // key -> entry
    const entries = [];             // every entry ever made, for "also makes"
    const ingWritten = new Map();   // ingredient key -> step where last written
    const carryNext = new Map();    // step -> the step that carried on from it
    const productKeys = new Set();
    const live = [];
    let pendingList = [];
    let idc = 0;

    const lineEnd = (s, cur) => {
      while (carryNext.has(s) && carryNext.get(s) !== cur && carryNext.get(s).index < cur.index) s = carryNext.get(s);
      return s;
    };
    const addInput = (st, from, info) => {
      if (from === st) return;
      let inp = st.inputs.find(i => i.type === 'step' && i.from === from);
      if (!inp) {
        inp = { type: 'step', from, names: [], carry: false };
        st.inputs.push(inp);
        from.consumers.push(st);
      }
      if (info.carry) inp.carry = true;
      if (info.name && !inp.names.some(n => n.name.toLowerCase() === info.name.toLowerCase() && n.qty === info.qty)) {
        inp.names.push({ name: info.name, qty: info.qty || '' });
      }
    };
    const newEntry = (key, display, node, qtyRaw, via) => {
      const e = { key, display, node, qtyRaw, uses: [], usedUpBy: null, handedOn: false, via };
      names.set(key, e);
      entries.push(e);
      productKeys.add(key);
      return e;
    };

    for (const sec of sections) {
      if (!sec.active) continue;
      if (sec.list) { pendingList.push(...sec.listItems); continue; }
      const act = sec.steps.filter(s => s.active);
      let prev = null;
      act.forEach((st, k) => {
        st.id = 's' + (idc++);
        if (pendingList.length && k === 0) {
          st.inputs.push(...pendingList.map(c => ({ type: 'leaf', comp: c, fromList: true })));
          pendingList = [];
        }
        const ingr = st.comps.filter(c => c.kind === 'ing');
        const uses = ingr.filter(c => c.mods.includes('&'));
        const raw = ingr.filter(c => !c.mods.includes('&') && c.name);
        // RENDERER (as Cooking-for-Engineers tables do): a step with no inputs at all, at the start
        // of a line, is a full-width "before you start" row, and nothing carries on from it.
        const hasOwn = x => x.comps.some(c => c.kind === 'ing' && c.name);
        const laterHasInputs = act.slice(k + 1).some(hasOwn);
        if (!raw.length && !uses.length && !st.inputs.length && (!prev || prev.setup) && laterHasInputs) {
          st.setup = true;
          prev = st;
          return;
        }
        live.push(st);
        if (!raw.length && !uses.length && !st.inputs.length && (!prev || prev.setup)) {
          reports.push({ level: 'info', rule: 9, msg: `Step ${st.index + 1} starts ${sec.name ? '“' + sec.name + '”' : 'the recipe'} and takes nothing in, so nothing before it feeds it. If it works on something made earlier, name it with @&name{}.`, step: st });
        }
        // rule 9: carry on from the step before, unless it named a product
        if (prev && !prev.setup && prev.products.length === 0) {
          addInput(st, prev, { carry: true });
          carryNext.set(prev, st);
        }
        const wholeUsed = [];
        for (const c of st.comps) {
          if (c.kind !== 'ing' || !c.name) continue;
          if (!c.mods.includes('&')) {
            st.inputs.push({ type: 'leaf', comp: c });
            ingWritten.set(c.key, st);
            if (productKeys.has(c.key)) reports.push({ level: 'warn', rule: 5, msg: `“${c.display}” is both an ingredient and a product.`, step: st });
            continue;
          }
          const key = c.key;
          const label = c.display;
          const qty = c.qtyRaw && c.qtyRaw.trim() ? c.qtyRaw : '';
          if (sec.product && sec.product.key === key && !names.has(key + '\u0000done')) {
            // rule 7: inside its own section, the section's name is what is made so far
            const ownEntry = names.get(key);
            if (!ownEntry || ownEntry.section !== sec) {
              if (prev && !prev.setup) { addInput(st, prev, { name: label, qty }); continue; }
              if (!ownEntry) {
                reports.push({ level: 'error', rule: 7, msg: `“${label}” is used in the first step of its own section, before anything is made.`, step: st });
                st.inputs.push({ type: 'missing', comp: c });
                continue;
              }
            }
          }
          const e = names.get(key);
          if (e) {
            if (e.usedUpBy) reports.push({ level: 'error', rule: 8, msg: `“${label}” is used after step ${e.usedUpBy.index + 1} used it up.`, step: st });
            // RENDERER: a product handed on (rule 8) follows the line it was handed to (rule 9),
            // as rule 23 does for ingredients.
            const from = e.node.index < st.index ? lineEnd(e.node, st) : e.node;
            addInput(st, from, { name: label, qty });
            // a repeated action (`Add ×` the @&stock{1%ladle}) works through the whole product
            e.uses.push({ step: st, qty, repeat: st.actions.some(a => a.includes('×')) });
            if (!qty) wholeUsed.push(key);
            continue;
          }
          if (ingWritten.has(key)) {
            // Part E, rule 23: the ingredient as it now is, from the end of its line
            const from = lineEnd(ingWritten.get(key), st);
            if (from !== st) addInput(st, from, { name: label, qty, ingRef: true });
            if (qty) reports.push({ level: 'info', rule: 25, msg: `@&${label}{${qty}} takes part of the ${label} written in step ${ingWritten.get(key).index + 1}. If more ${label} was meant, write @${label}{${qty}} or @+${label}{${qty}}.`, step: st });
            continue;
          }
          reports.push({ level: 'error', rule: 6, msg: `“${label}” is used, but no product or ingredient of that name comes before it.`, step: st });
          st.inputs.push({ type: 'missing', comp: c });
        }
        // products named in the tail
        for (const p of st.products) {
          if (ingWritten.has(p.key)) reports.push({ level: 'warn', rule: 5, msg: `“${p.name}” names a product and an ingredient.`, step: st });
          const old = names.get(p.key);
          if (old && !wholeUsed.includes(p.key) && old.node.section !== st.section) {
            reports.push({ level: 'warn', rule: 5, msg: `“${p.name}” is named twice.`, step: st });
          }
          const e = newEntry(p.key, p.name, st, p.qtyRaw, 'step');
          e.section = sec;
          if (old && wholeUsed.includes(p.key)) old.handedOn = true;
        }
        if (st.products.length) {
          for (const k2 of wholeUsed) {
            if (st.products.some(p => p.key === k2)) continue;
            const e = names.get(k2);
            if (e) e.usedUpBy = st;
          }
        } else {
          // rule 8: a name goes on to what the step makes
          for (const k2 of wholeUsed) {
            const old = names.get(k2);
            old.handedOn = true;
            const e = newEntry(k2, old.display, st, null, 'handed');
            e.section = old.section;
          }
        }
        prev = st;
      });
      // rule 2 / 18: the section's product is what its last step makes
      const last = [...act].reverse().find(s => !s.setup);
      if (sec.product && last) {
        if (last.products.length >= 2) reports.push({ level: 'warn', rule: 18, msg: `Section “${sec.name}” names “${sec.product.name}”, but its last step names ${last.products.length} products.`, step: last });
        const old = names.get(sec.product.key);
        if (old && old.node !== last) old.handedOn = true;
        const e = newEntry(sec.product.key, sec.product.name, last, sec.product.qtyRaw, 'section');
        e.section = null;
        last.sectionProduct = sec.product;
      } else if (sec.product && !last) {
        reports.push({ level: 'warn', rule: 2, msg: `Section “${sec.name}” names “${sec.product.name}” but has no steps.` });
      }
      if (sec.product) names.set(sec.product.key + '\u0000done', true);
    }
    for (const [k] of names) if (k.endsWith('\u0000done')) names.delete(k);

    // rule 19: the dish is what the last step makes
    const rootStep = live[live.length - 1] || null;
    const sinks = live.filter(s => s !== rootStep && s.consumers.length === 0);

    // rule 20: by-products
    const alsoMakes = [];
    for (const e of entries) {
      if (e.node === rootStep || e.handedOn || e.usedUpBy) continue;
      if (!e.uses.length && e.via !== 'step' && e.node.consumers.length) continue;
      if (isCountProduct(e)) continue;
      if (!e.uses.length) {
        if (!alsoMakes.some(a => a.key === e.key && a.node === e.node)) alsoMakes.push({ key: e.key, name: e.display, qty: e.qtyRaw, node: e.node, kind: 'unused' });
      } else if (e.uses.every(u => u.qty && !u.repeat)) {
        alsoMakes.push({ key: e.key, name: e.display, node: e.node, kind: 'rest', uses: e.uses });
      }
    }
    // a share above the whole, or uses over the amount made (rule 14)
    for (const e of entries) {
      for (const u of e.uses) {
        if (u.qty && !u.qty.includes('%') && !isCountProduct(e) && Number(eval0(u.qty)) > 1) {
          reports.push({ level: 'warn', rule: 14, msg: `A share of ${u.qty} of “${e.display}” is more than the whole.`, step: u.step });
        }
      }
      if (isCountProduct(e)) {
        const made = Number(eval0(e.qtyRaw));
        const taken = e.uses.reduce((a, u) => a + (u.qty ? Number(eval0(u.qty)) || 0 : 0), 0);
        if (made && taken > made) reports.push({ level: 'warn', rule: 14, msg: `${taken} of “${e.display}” are used, ${made} were made.` });
        const wholeRest = e.uses.some(u => !u.qty);
        if (made && taken < made && !wholeRest && e.uses.length && !alsoMakes.some(a => a.key === e.key)) {
          alsoMakes.push({ key: e.key, name: e.display, node: e.node, kind: 'count', left: made - taken });
        }
      }
    }
    return { live, root: rootStep, sinks, alsoMakes, setup: steps.filter(s => s.setup && s.active) };
  }

  function isCountProduct(e) { return e.qtyRaw && isCountOnly(e.qtyRaw); }
  function eval0(q) {
    if (!q) return NaN;
    q = q.replace(/^=/, '').trim();
    const m = q.match(/^(\d+)\/(\d+)$/);
    if (m) return Number(m[1]) / Number(m[2]);
    return Number(q);
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
        else if (c.kind === 'timer') html += '<span class="tm">' + esc(compLabel(c)) + '</span>';
        else html += '<span class="' + (c.kind === 'cw' ? 'cw' : 'ing') + '">' + esc(c.display) + '</span>';
      } else if (sg.t === 'group') {
        if (!sg.chosen) continue;
        const c = sg.chosen;
        html += '<span class="' + (c.kind === 'cw' ? 'cw' : 'ing') + '">' + esc(c.kind === 'timer' ? compLabel(c) : (c.display || c.name)) + '</span>';
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

  function renderHTML(src, selection) {
    const a = analyse(src, selection);
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

  const api = { analyse, renderHTML, fmtQty, tokenize, parseFrontMatter, slug: n => n.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CookDag = api;
})(typeof window !== 'undefined' ? window : this);
