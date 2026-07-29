# Bear formation calculator

Splits your troops into up to 6 bear hunt marches at a fixed composition ratio (infantry / cavalry / archers), respecting your per-march deployment capacity.

**Live:** https://YOUR-USERNAME.github.io/bear-formation-calculator/

## How it works

1. Troop ceiling — the scarcest troop type relative to its share sets the limit:

   ```
   T_troops = min(Inf / r_inf, Cav / r_cav, Arc / r_arc)
   ```

2. Per-march deployment cap. Valora's **Savage Advantage** (skill 4) adds +3,000 Bear Hunt squad capacity per level, up to +30,000 at Lv. 10:

   ```
   C = base deployment capacity + 3,000 × savage_level
   ```

3. Deployable total — whichever binds first:

   ```
   T = min(T_troops, C × n)
   ```

4. Per march:

   ```
   M = T / n
   infantry = M × r_inf
   cavalry  = M × r_cav
   archers  = M × r_arc
   ```

Rounding uses the largest-remainder method so per-march numbers sum exactly to the total — no drift.

Marches are capped at 6 — the game's limit. Leave the deployment capacity at `0` to treat it as unlimited.

## Example

At a 10 / 10 / 80 ratio with 281,850 infantry, 292,799 cavalry and 566,040 archers, archers are the bottleneck: 566,040 / 0.80 = **707,550 total**.

| Marches | Infantry | Cavalry | Archers | March size |
| ------- | -------- | -------- | ------- | ---------- |
| 4       | 17,689   | 17,689   | 141,510 | 176,888    |
| 5       | 14,151   | 14,151   | 113,208 | 141,510    |
| 6       | 11,793   | 11,793   | 94,340  | 117,925    |

## Units

Every number field accepts shorthand — `566k`, `1.2m` and `281,850` all parse to the same thing. The display toggle switches results between `k` / `m` shorthand and full numbers.

## Running locally

It's a single self-contained file with no build step and no dependencies. Open `index.html` in any browser, online or off.
