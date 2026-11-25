# Cooklang spec 2.0 demo: recipes as flow charts

A recipe is a graph. The pastry and the filling are made apart and meet in the tin; the
stock is made once and used twice. Cooklang today writes a recipe as a list of steps,
and nothing in the file says which step feeds which.

Three open proposals to the [Cooklang spec](https://github.com/cooklang/spec) add the
missing marks. This repo draws recipes written with them, so you can see what the
syntax buys before it is accepted.

The page runs the real parser: [cooklang-rs](https://github.com/cooklang/cooklang-rs) on
its [`spec-2.0` branch](https://github.com/cooklang/cooklang-rs/tree/spec-2.0), which
implements the three proposals behind extension flags, compiled to WebAssembly and
inlined into `index.html`.

**Try it:** https://cooklang.github.io/spec-2.0-demo/, or open `index.html` in a browser.
It is one static file (about 2 MB, most of it the parser) and works offline, except
for the web fonts. Pick a recipe, switch its choices, or press *Edit source* and
type: the chart redraws as you go.

## The syntax in one recipe

```cooklang
---
title: Pancakes
servings: 4
makes: about fourteen 4-inch cakes
---

`Separate` @eggs{1-2}. -> yolks + whites

= Batter

`Sift together` @flour{1.5%cup}|(@flour{3%parts} + @cornmeal{1%part}),
@double-acting baking powder{1.75%tsp}, @sugar{3%tbsp} and @?salt{1%tsp}. -> dry ingredients

`Mix` @milk{1.25%cups}, @melted butter{3%tbsp}|@canola oil{} and the @&yolks{}. -> milk mixture

`Stir` the @&milk mixture{} into the @&dry ingredients{}, mixing thoroughly. -> batter

`Beat` the @&whites{} until ~{stiff}. -> beaten whites

`Fold` the @&beaten whites{} into the @&batter{} immediately before cooking.

`Fry` on a #griddle{} at medium heat.
```

| Mark | Meaning | Proposal |
|---|---|---|
| `… -> batter` at the end of a step, `= Shell -> shell` on a section | names what the step or section makes | [0027 products](https://github.com/cooklang/spec/pull/165) |
| `@&batter{}`, `@&whites{3}`, `@&stock{500%ml}` | uses all of it, or part of it, in a later step; never on the shopping list | 0027 |
| `-> yolks{4} + whites{4}` | one step, two products, with the amounts made | 0027 |
| `` `Fold` `` | the step's action, shown in bold as the block's label | [0029 step actions](https://github.com/cooklang/spec/pull/167) |
| `@butter{}\|@oil{}`, `?vegetarian`, `?yeast=fresh:` | alternatives, toggles and choices; they fill the substitutions box and the pickers | [0025 alternatives and labels](https://github.com/cooklang/spec/pull/162) |

The branch also takes two smaller drafts the examples use: nameless quantities
(`@{9}`, [0030](https://github.com/cooklang/spec/pull/168)) and timers whose value is a
condition (`~{golden}`). Other drafts in the examples (dual units `{4%oz|115%g}`, named
timers `~oven{}`, baker's percentages) are read as today's parser reads them and shown
as written; where the parser objects, the reports panel says so.

## How the chart is drawn

- **Steps are blocks; ingredients are rows** that point into the step that uses them.
- **Edges come only from the file**, and from the parser: `cooklang::spec2::graph`
  follows the proposal text. A step carries on from the step before it in its section,
  unless that step named a product (rule 9 of 0027). `@&name{}` joins a product made
  elsewhere. Nothing is guessed from the prose.
- **The dark column on the right is the main line**: from the dish back through the input
  with the most ingredients behind it. Every other branch flows in from the left.
- **A product used twice is drawn once.** The second use is a striped row saying
  *from step N*, in the colour it was made in.
- **The last step makes the dish** (rule 19); the plate at the bottom shows `servings`,
  `yield` and `makes`.
- **Also makes** lists by-products: a product nobody uses, the rest of one only partly
  used, egg whites left over (rule 20).
- **The reports panel** shows what the parser says: its own errors and warnings, and
  the reports of the proposal (a product used before it is named, used after it was
  used up, named like an ingredient, an ingredient used after it went into a product).

Three drawing choices are not in any proposal. They are made on top of the parser's
graph, and marked `RENDERER` in `src/adapter.js` and `src/dag-core.js`:

1. Steps with nothing going in at the start of a line (grease the tin, preheat the oven)
   sit above the chart as "before you start", and nothing carries on from them.
2. A product handed on to the step that used it (rule 8) follows the line of steps that
   carry on from there, as rule 23 does for ingredients.
3. A branch fed only by something already drawn keeps that thing's colour, so the egg
   whites stay the colour of the eggs.

## What the drawings show about the rules

Drawing every example is a cheap way to test a proposal. These came out of it:

- **Rule 9 joins steps that are not related.** In *Handmade Pasta Carbonara*, browning
  the guanciale feeds the egg mix; in *Bread Rolls*, warming the milk feeds the dry mix.
  The proposal names this cost; the chart makes it visible.
- **A section that starts with a step that takes nothing in drops what came before.**
  *Country Loaf*'s "Shape" does not say `@&dough{}`, so the dough becomes a by-product
  and the shaping line starts from nothing.
- **Rule 8, read strictly, hands a name to the step that used it, not to the end of its
  line.** In *Sourdough Loaf*, "Turn the dough" would then come from "Shape", and
  "Cold proof" would feed nothing. The renderer follows the line instead (choice 2
  above).
- **Rule 25 reads `@&name{amount}` on an ingredient as part of what was written before,
  not more of it.** *Carbonara*'s `@&eggs{3}` and *Sourdough*'s
  `@&bread flour{80%flour}` were written to mean more; the reports panel flags both.
- **Rules 9 and 23 together report the proposal's own Part E example.** In "Melt the
  butter. / Whisk the eggs with the sugar. -> egg mix / Pour the `@&butter{}` into the
  `@&egg mix{}`", rule 9 carries the whisking on from the melting, so the butter's line
  ends in the egg mix, and rule 23 asks for `@&egg mix{}` instead. *Ratatouille* and
  *Chocolate Silk Pie* hit the same report.

## Files

```
index.html             the built page (open it, or serve it with GitHub Pages)
build.js               node build.js: inlines the parser, src/ and every recipe into index.html
vendor/                the parser: cooklang-rs spec-2.0 built to wasm (see vendor/README.md)
src/parser.js          loads the wasm and calls Parser.parse_spec2
src/adapter.js         turns the parser's recipe and graph into steps and boxes to draw
src/dag-core.js        layout and drawing; no DOM, runs in node and the browser
src/template.html      the page: styles, controls, panels
recipes/demo/          Pancakes, and the tart from proposal 0027 with its own table
recipes/examples/      spec 2.0 example recipes (choices, sub-recipes, Russian, French)
recipes/pack/          recipes from an AI-written pack, converted by hand
recipes/bases/         shortcrust and chicken stock, referenced by other recipes
test/sweep.js          npm test: every recipe under every choice and toggle
test/graphs.js         node test/graphs.js [name]: each recipe's graph and reports
test/parity.js         npm run parity: the parser's graphs against the first JS reading
test/reference/        that first reading, a regex parser kept only for the parity test
social/card.html       the social preview card; social/render-og.sh renders it to og.png
og.png                 1200×630 preview used by the Open Graph and Twitter tags
```

No npm dependencies. Node 18 or later for the build and the tests, which load the same
wasm as the page. Rebuilding the parser needs Rust and wasm-pack; see `vendor/README.md`.

After changing the page, run `node build.js`, then `./social/render-og.sh` if the
pancake chart changed (it needs Google Chrome; set `CHROME` to its path off macOS).
GitHub serves `index.html` and `og.png` from `main` with Pages, so pushing publishes both.

`CookParser.parse(source, selection)` returns the parser's JSON,
`CookAdapter.analyse(json)` the steps and boxes, and `CookDag.renderHTML(analysis)` the
chart. A selection looks like
`{ choices: { pastry: 'shop-bought' }, toggles: { vegetarian: true } }`.

## Not done

Scaling, unit conversion, a Gantt chart or a plan for two cooks, `.menu` files, and
drawing a product used by two later steps as a real fork (it is a "from step N" row).
The parser branch is a draft that tracks the proposals and is not released. Its
ingredient list and shopping list were not changed for rule 25, and were not checked
against it.

## Credits

The parser is [cooklang-rs](https://github.com/cooklang/cooklang-rs), MIT licence;
its notice is in `vendor/LICENSE-cooklang-rs`.

The layout is after the flow charts in *Joy of Cooking* (Irma S. Rombauer and Marion
Rombauer Becker, 1975 edition) and the tables of
[Cooking for Engineers](https://www.cookingforengineers.com). The pancake recipe is
adapted from *Joy of Cooking*.
