# Bear formation calculator

Splits your troops into up to 7 bear hunt marches at a fixed composition ratio (infantry / cavalry / archers), respecting the deployment capacity of each individual march.

**Live:** https://maystery.github.io/bear-formation-calculator/

## How it works

1. **Troop ceiling** — the scarcest troop type relative to its share sets the limit:

   ```
   T_troops = min(Inf / r_inf, Cav / r_cav, Arc / r_arc)
   ```

2. **Per-march cap.** Marches are *not* all worth the same. A march led by a hero uses your base deploy cap plus Valora's **Savage Advantage** (skill 4), which adds +3,000 Bear Hunt squad capacity per level, up to +30,000 at Lv. 10. A march with no hero left to lead it is held to the plain squad deployment capacity instead:

   ```
   cap_hero = base deploy cap + 3,000 × savage_level
   cap_none = squad deployment capacity
   ```

   Set either to `0` to treat it as unlimited.

3. **Deployable total** — the troop ceiling or the sum of every march's own cap, whichever binds first:

   ```
   T = min(T_troops, Σ cap_i)
   ```

   Hero-led rallies receive the available troops first:

   ```
   T_hero = min(T, Σ hero caps)
   T_none = T - T_hero
   ```

   `T_hero` is distributed evenly among the hero rallies until they reach their individual caps. Only then is `T_none` distributed among no-hero rallies. Water-filling within each group keeps its rallies balanced when their caps differ.

4. **Per march** — each march splits at the ratio:

   ```
   infantry = M × r_inf
   cavalry  = M × r_cav
   archers  = M × r_arc
   ```

Rounding uses the largest-remainder method, followed by a global reconciliation across marches. Every march sums exactly to its total, and the combined formation never uses more of a troop type than you own.

Marches are capped at 7, the game's limit.

## Heroes

Five heroes can lead a march: **Amadeus**, **Hilde**, **Chenko**, **Yeonwoo** and **Amane**. Leader priority is **Amadeus**, **Chenko**, **Yeonwoo**, **Amane**, then **Hilde**, and each hero you enable converts a march from the squad cap to the larger hero cap.

Untick a hero to drop them from the split — if you don't own them, haven't levelled their skill, or just want to see the numbers without them. Hilde needs her first Expedition skill at **level 5 minimum**, while Chenko, Yeonwoo and Amane need their first Expedition skill at **level 4 minimum**, to be worth counting. Enable more heroes than you have marches and the extras simply sit out.

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

Everything you type is saved in the browser, along with your theme, which sections are collapsed, and which heroes are enabled. **Reset** clears the lot and restores the defaults. The theme button cycles auto (follow your system) → light → dark.

Use **Copy formation** to copy the calculated marches as readable text. The result table also shows each march's used capacity, effective cap and utilization percentage. **Copy setup link** creates a URL containing the troop, ratio, capacity, march and hero settings; opening that link loads the shared setup over the browser's saved values and shows a confirmation banner.

## Running locally

It's a static site with no build step or external dependencies. Keep the repository files together, then open `index.html` in any browser, online or off.

The files are separated by responsibility: `index.html` contains the markup, `styles.css` the presentation, `app.js` the browser behavior, and `calculator-core.js` the pure calculation logic.

## Tests

The pure parsing and calculation logic lives in `calculator-core.js`. With Node.js installed, run the dependency-free regression suite using:

```sh
npm test
```
