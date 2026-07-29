# March Ratio Calculator

Splits your troops into equal marches at a fixed composition ratio (infantry / cavalry / archers).

**Live:** https://YOUR-USERNAME.github.io/march-calculator/

## How it works

1. Max deployable total — the scarcest troop type relative to its share sets the ceiling:

   ```
   T = min(Inf / r_inf, Cav / r_cav, Arc / r_arc)
   ```

2. With a max march capacity `C` over `n` marches:

   ```
   T = min(T, C × n)
   ```

   Marches you can fill completely: `floor(T_troops / C)`

3. Per march:

   ```
   M = T / n
   infantry = M × r_inf
   cavalry  = M × r_cav
   archers  = M × r_arc
   ```

Rounding uses the largest-remainder method so per-march numbers sum exactly to the total — no drift.

## Example

At a 10 / 10 / 80 ratio with 281,850 infantry, 292,799 cavalry and 566,040 archers, archers are the bottleneck: 566,040 / 0.80 = **707,550 total**.

| Marches | Infantry | Cavalry | Archers | March size |
| ------- | -------- | -------- | ------- | ---------- |
| 4       | 17,689   | 17,689   | 141,510 | 176,888    |
| 5       | 14,151   | 14,151   | 113,208 | 141,510    |
| 6       | 11,793   | 11,793   | 94,340  | 117,925    |

## Running locally

It's a single self-contained file with no build step and no dependencies. Open `index.html` in any browser, online or off.
