# Bear formation calculator

Splits your troops into up to 7 bear hunt marches at a fixed composition ratio (infantry / cavalry / archers), respecting the deployment capacity of each individual march.

**Live:** https://maystery.github.io/bear-formation-calculator/

## How it works

1. **Troop ceiling** — the scarcest troop type relative to its share sets the limit:

   ```
   T_troops = min(Inf / r_inf, Cav / r_cav, Arc / r_arc)
   ```

2. **Per-march cap.** Marches are _not_ all worth the same. A march led by a hero uses your base deploy cap plus Valora's **Savage Advantage** (skill 4), which adds +3,000 Bear Hunt squad capacity per level, up to +30,000 at Lv. 10. When enabled, Mighty Bison’s **Fearless Roar** adds another +1,500 per selected skill level, up to +15,000 at Lv. 10. Its selected level is saved even while inactive. A march with no hero left to lead it is held to the plain squad deployment capacity instead:

   ```
   cap_hero = base deploy cap + 3,000 × valora_level + (bison active ? 1,500 × bison_level : 0)
   cap_none = squad deployment capacity
   ```

   Set either to `0` to treat it as unlimited.

3. **Deployable total** — the troop ceiling or the sum of every march's own cap, whichever binds first:

   ```
   T = min(T_troops, Σ cap_i)
   ```

   The selected filling strategy decides how that total is distributed:

   - **Balance marches** water-fills every march evenly while respecting its individual cap.
   - **Fill in order** fills March 1 to its cap, then March 2, and continues in order until the available troops run out.

4. **Per march** — each march splits at the ratio:

   ```
   infantry = M × r_inf
   cavalry  = M × r_cav
   archers  = M × r_arc
   ```

Rounding uses the largest-remainder method, followed by a global reconciliation across marches. Every march sums exactly to its total, and the combined formation never uses more of a troop type than you own.

Marches are capped at 7, the game's limit.

## Heroes

Nine heroes can lead a march, in this assignment priority: **Wee & Woo**, **Amadeus**, **Chenko**, **Yeonwoo**, **Amane**, **Margot**, **Vivian**, **Ava**, and **Hilde**. Each enabled hero converts a march from the squad cap to the hero cap. Amadeus starts disabled; the other eight start enabled.

Untick a hero to leave them out of the split. The cards show recommended skill levels and effect progression; the priority strip shows assignment order. Enable more heroes than you have marches and the extras sit out. The calculator still supports at most seven marches.

## Example

At a 10 / 10 / 80 ratio with 281,850 infantry, 292,799 cavalry and 566,040 archers, 5 marches, a 98,900 squad capacity, a 139,310 base deploy cap and Savage Advantage at Lv. 10 — so 169,310 per hero march — with Chenko, Yeonwoo and Amane leading:

| March | Leader  | Infantry | Cavalry | Archers | Total       |
| ----- | ------- | -------- | ------- | ------- | ----------- |
| 1     | Chenko  | 16,931   | 16,931  | 135,448 | 169,310     |
| 2     | Yeonwoo | 16,931   | 16,931  | 135,448 | 169,310     |
| 3     | Amane   | 16,931   | 16,931  | 135,448 | 169,310     |
| 4     | —       | 9,890    | 9,890   | 79,120  | 98,900      |
| 5     | —       | 9,890    | 9,890   | 79,120  | 98,900      |
|       |         | 70,573   | 70,573  | 564,584 | **705,730** |

Here the caps bind before the troops do: the marches hold 705,730 between them, just under the 707,550 the archers would otherwise allow. Turning Amadeus on lifts march 4 to the hero cap, at which point archers become the bottleneck instead.

## Check a march

Paste the troop numbers from a march you've already set and it reports each type's actual share against the target, flagging anything outside your tolerance in percentage points.

## Units

Every number field accepts shorthand — `566k`, `1.2m` and `281,850` all parse to the same thing. The display toggle switches results between `k` / `m` shorthand and full numbers.

## Interface

Everything you type is saved in the browser, including the filling strategy, along with your theme, which sections are collapsed, and which heroes are enabled. **Reset** clears the lot and restores the defaults. The theme button cycles auto (follow your system) → light → dark.

Use **Copy formation** to copy the calculated marches as readable text. The result table also shows each march's used capacity, effective cap and utilization percentage. **Copy setup link** creates a URL containing the troop, ratio, capacity, march, filling strategy and hero settings; opening that link loads the shared setup over the browser's saved values and shows a confirmation banner.

## Running locally

The footer displays the app version and deployed commit hash. Select the version to open the dedicated **Release history** page at `changelog/`, linked directly to that version. Release history is maintained in `release-history.js`; see [Publishing an update](docs/maintaining.md#publishing-an-update) for version updates. GitHub Pages supplies the commit hash automatically; opening the source locally shows **Local preview**.

It's a static site with no build step or external dependencies. Keep the repository files together, then open `index.html` in any browser, online or off.

`app.js` initializes the page and schedules updates. Browser controllers own their individual controls; the calculation and settings modules also run directly in Node. See [the maintenance guide](docs/maintaining.md) for file responsibilities and how to add a field or hero.

`styles.css` has named component sections, with touch, responsive, theme, and motion rules beside their components. The HTML loads classic deferred scripts in dependency order, preserving support for opening `index.html` directly without a server.

The page serves WebP artwork sized for high-density screens. The original PNGs remain alongside the exports for future edits. To regenerate the WebP files, install ImageMagick with WebP support and run `python3 scripts/export-artwork.py`. This is only needed when changing artwork; running the site needs no build step.

Input changes render at most once per animation frame, and edits in **Check a march** update that section alone. Browser saves are debounced by 250 ms and flushed when the page is hidden or left. Feedback animations respect reduced-motion preferences.

Hero portraits load within 400 pixels of the viewport, with their space reserved before loading. Card animations pause off-screen and when the page is hidden. Browsers without `IntersectionObserver` load all portraits immediately. Hero and buff controls refresh only when their settings change, and closed popups perform no positioning or picker queries on scroll.

## Tests

The pure parsing and calculation logic lives in `calculator-core.js`. With Node.js installed, run the dependency-free regression suite using:

```sh
npm test
```

Browser regression checks cover rendering, saving, reset, shared setups, controls, and reduced motion. Use Node.js 24 (the version in `.nvmrc` and CI). Install the pinned development dependencies and matching Chromium and WebKit browsers, then run:

```sh
npm ci
npx playwright install chromium webkit
npm run test:all
```

`npm run check` runs ESLint, Prettier, and the TypeScript checker without emitting files. Run it before opening a pull request; CI runs the same check before the test suites.

Playwright is pinned in `package.json` and `package-lock.json` and is only used for browser checks; the site and `npm test` remain dependency-free. Individual suites are available as `test:browser`, `test:mobile`, and `test:performance`.

GitHub Actions runs all suites on pushes and pull requests and uploads mobile screenshots. On Linux, `npx playwright install --with-deps chromium webkit` also installs the required system libraries.

The performance suite checks lazy portrait loading, stable card dimensions, off-screen animations, unchanged control updates, and popup scroll work in Chromium and WebKit. It also covers collapsed hero sections and the fallback for browsers without intersection observation.

The mobile suite uses touch emulation in Chromium and WebKit at 320, 360, 390, 430, 768, and 844 pixels, in light and dark themes. It checks card bounds, input text size, touch targets, menus, rotation, troop entry, table scrolling, copying, persistence, and reset. Run `npm run test:mobile -- --screenshots` to save viewport screenshots under `artifacts/browser/mobile/` for visual review. Browser emulation does not replace checks on a physical phone with its on-screen keyboard.
