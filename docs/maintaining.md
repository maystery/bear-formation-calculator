# Maintaining the calculator

The site has no build step. Keep script order in `index.html`: pure calculation and hero metadata first, settings next, browser controllers after their dependencies, and `app.js` last. Classic deferred scripts allow the site to run from a local file as well as an HTTP server.

## Responsibilities

| File                     | Owns                                                                              |
| ------------------------ | --------------------------------------------------------------------------------- |
| `calculator-core.js`     | Parsing, capacity rules, allocation, rounding, and `calculateFormation(settings)` |
| `hero-ui.js`             | Hero metadata, assignment priority, and generated card markup                     |
| `settings.js`            | Field schema, validation, serialization, and setup URL compatibility              |
| `hero-controller.js`     | Card state, portrait loading, visibility, and skill popovers                      |
| `capacity-controller.js` | Capacity summaries, skill menus, and Bison state                                  |
| `settings-controller.js` | Reading/applying browser settings, theme, storage, and save scheduling            |
| `formation-view.js`      | Field validation feedback, result rendering, march checking, and formation text   |
| `feedback.js`            | Feedback animations and clipboard fallback                                        |
| `app.js`                 | Controller initialization, event wiring, batched updates, copy actions, and reset |
| `styles.css`             | Named component sections, with responsive and accessibility overrides nearby      |

Create each browser controller once per page load. Controllers own their render caches and popup state. Application updates go through the scheduled callback; explicit copy actions flush pending rendering first. Checker-only edits reuse the last valid formation ratio. Saves are debounced and flushed on page hide; reset cancels both pending rendering and saving.

`calculateFormation` takes parsed troop counts, non-negative ratio weights, march count, ordered leader keys, capacities, skill levels, buff state, and filling strategy. It returns the full result, including bottlenecks and per-march rows, without reading the DOM or mutating its inputs. A zero ratio returns `valid:false`. Number-field errors are handled by the view before calling it. Zero capacities mean unlimited capacity.

## Adding a setting

1. Add accessible markup and its initial value to `index.html`. Hero checkboxes come from `hero-ui.js`.
2. Add its definition to `FIELDS` in `settings.js`: ID, kind, and update scope. Use `formation` for shared calculation fields, `check` for checker-only fields, or `preference` for local settings.
3. Preserve existing storage keys and share keys. For a new control kind, extend parsing and the browser read/apply adapter. Numeric draft strings are intentionally preserved so invalid saved entries remain editable.
4. Connect its value to the relevant calculation or controller and test the resulting behavior. The schema supplies normal input events, validation, persistence, and sharing; radio groups are bound separately from ordinary inputs.

`bearcalc.v1` remains the storage key. The small theme initializer in the HTML must use the same key before styles load. Shared setups use `setup=1` and override only supplied recognized formation fields, preserving checker drafts and local preferences. Older `sav` parameters are removed by reset.

## Adding a hero or changing artwork

Add metadata to `HEROES` and place the key in `HERO_SLOTS` in `hero-ui.js`; that order drives cards, priority chips, assignment, and settings fields. The expedition skill’s `recommendedLevel` is the single source for card and popover level guidance. It does not restrict hero selection; recommended stat values separately highlight effect progression rows. Update the README roster and hero expectations in the unit tests. Export assets with `python3 scripts/export-artwork.py` and check small-screen portrait clipping and wrapped skill names.

## Validation

Run `npm ci` and `npx playwright install chromium webkit`, then `npm run test:all`. Node.js 24 is recorded in `.nvmrc` and matches CI. `npm test` also works without installing dependencies.

`npm run check` runs ESLint, Prettier, and TypeScript’s declaration-aware check. It does not emit JavaScript. Keep JSDoc contracts in sync with `types.d.ts` when changing public module shapes.

The unit suites exercise complete formations and settings compatibility, in addition to allocation and markup. Browser suites check behavior across desktop and mobile, including keyboard/touch controls, persistence, deferred loading, and performance invariants. Prefer observable conditions over fixed waits; the remaining timed observations deliberately check that no extra save occurs after the debounce interval.

For presentation changes, run `npm run test:mobile -- --screenshots` and review light/dark screenshots at narrow widths and landscape sizes under `artifacts/browser/mobile/`. Screenshots are review artifacts, not pixel baselines. CI uploads them after each run. Emulation cannot verify an actual phone's on-screen keyboard.
