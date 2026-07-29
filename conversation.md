# Bear formation calculator — build log

A record of the conversation that produced this project, 29 July 2026.

User messages are reproduced verbatim. Assistant replies are condensed to their substance — decisions, formulas, and reasoning — with incidental tool chatter removed. Uploaded screenshots are described rather than embedded.

---

## 1. The original question

**Márk:**
> I want to use the following ratio: 10 % infantry, 10 % cavalary, 80 % archers. I have infantry 281850, cavalry 292799, archer 566040 What will be the exact number, if you want to send 4-6 march?
>
> Can you create a formula and a small app for this, that can calculate this

**Claude:** Built `march-ratio-calculator.html` and answered the maths.

The formula: `T = min(Inf/0.10, Cav/0.10, Arc/0.80)` — the scarcest troop relative to its share caps everything, then split `T/n` per march.

Archers are the bottleneck: 566,040 / 0.80 = **707,550 total** (70,755 inf + 70,755 cav + 566,040 arc). Infantry and cavalry each allow ~2.8M, nowhere near binding.

| Marches | Infantry | Cavalry | Archers | March size |
| ------- | -------- | -------- | ------- | ---------- |
| 4       | 17,689   | 17,689   | 141,510 | 176,888    |
| 5       | 14,151   | 14,151   | 113,208 | 141,510    |
| 6       | 11,793   | 11,793   | 94,340  | 117,925    |

5 marches divides perfectly with no rounding.

---

## 2. Max march capacity

**Márk:** *Add a new field, that will be max march capacity*

Added the field plus a "full marches possible" readout (`floor(troop_max / capacity)`), so it's visible whether troops or commander slots are the real limit.

---

## 3. Hosting

**Márk:** *Can I host this somewhere easily?*

Single self-contained file, no build step — any static host works. Netlify Drop (drag and drop, live in a minute), Cloudflare Pages (free, unlimited bandwidth), GitHub Pages (permanent, but assumes git). Tip: rename to `index.html` for a clean URL.

---

## 4. Creating the repo

**Márk:** *Create a gh repo and set a pages page for this*

No GitHub connector available and no `gh` CLI in the sandbox. Offered three routes; Márk chose "prep files + give me commands".

Prepared `index.html`, `README.md` and `.gitignore`, and supplied both the `gh` one-liner and the manual web-UI + git remote path.

> **Note:** the sandbox's mounted folder doesn't permit file deletion, which strands git's lock files and breaks subsequent commits — so `git init` had to be run locally rather than pre-initialized.

---

## 5. Rename

**Márk:** *Can you rename the repo to Bear formation calculator?*

Renamed to `bear-formation-calculator`; updated page title, heading, README title and the Pages URL.

---

## 6. Valora's first skill

**Márk:** *Can you add a new field for valora 1st skill. It can modify the bear march capacity* — with a screenshot of **Dance of the Hunt**, +30,000 Raging Bear Rally Squad Capacity per level, max 300,000 at Lv. 10.

Wired as `C = base capacity + 30,000 × level`.

---

## 7. `k` as a unit

**Márk:** *Can you create k as a unit of measure?*

Added shorthand parsing and display. `566k`, `1.2m` and `281,850` all parse identically; a toggle switches results between short form and full numbers.

---

## 8. Wrong skill — the correction

**Márk:** *Sorry, I missed the skill. It is the 4th skill. I attach the new levels* — screenshot of **Savage Advantage**, +3,000 Bear Hunt Squad Deployment Capacity per level, max 30,000 at Lv. 10.

The two skills cap different things, so both were modelled separately:

- **Savage Advantage** (skill 4) → +3,000/level to *each march's* deployment capacity
- **Dance of the Hunt** (skill 1) → +30,000/level to the *whole rally's* capacity

**Márk:** *Whole rally size doesn't matter. You can remove valora 1st skill*

Removed. Only troop stock and the per-march deployment cap remain.

---

## 9. Constraints and defaults

**Márk:** *Max march is 6* → capped in the input's `max` and clamped in the calculation.

**Márk:** *Can you set default march size to 139,310k* → read as 139,310 rather than 139 million; set as the base deploy cap.

**Márk:** *Can you set the default valora skill to 10?* → effective cap becomes 169,310.

---

## 10. Visual rework

**Márk:** *Can you make the html similar what I can see here?*

No screenshot had come through. Asked which target; Márk chose the inline chat widget. Restyled to light card tiles with colour coding, sliders, metric row, plus automatic light/dark following the system setting.

---

## 11. `k`/`m` explained

**Márk:** *what does k/m mean?*

k = thousand, m = million. `281.85k` = 281,850. Works in both directions — type either form, and the Units dropdown switches the display.

---

## 12. Presets

**Márk:** *Can you add a prefix card, one button on it. It sets 10%/10%/80% ratio and the title should be PEX*

Added a Presets card with a **PEX** button setting 10 / 10 / 80.

---

## 13. Hero identity

**Márk:** *mention Valora master on the skill card* → card reads **Valora · Savage Advantage · skill 4**.

**Márk:** *archer 80% not fit properly* → the browser's number-spinner arrows were eating the width. Removed them, switched to an even grid with centred text, moved type names to **Inf / Cav / Arc** labels underneath.

---

## 14. The Amadeus toggle

**Márk:** *Add another true false field. Do you have Amadeus? Can you find assets for amadeus?*

Amadeus couldn't be found in any Whiteout Survival hero listing, so the bonus was left editable rather than invented. On assets: game art is copyrighted, so pulling portraits into a public repo wasn't advisable without the user supplying them.

**Márk:** *Just the boolean needed and this pic* — supplied the portrait.

Bonus field dropped, leaving just the checkbox with the portrait beside it — greyscale at 45% when unchecked, full colour when ticked. Resized to 128px and inlined as base64 so the file stays standalone.

**Márk:** *I want to use this as well later* — two more portraits, saved and later renamed to `chenko.png` and `yeonwoo.png`.

---

## 15. Leader column

**Márk:**
> Create a new column for the marches. Leader hero.
> If you have amadeus the first rally will be assignt to amadeus
> 2nd, chenko 3rd, yeonwoo
> If you don't have amadeus the 1st chenko 2nd yeonwoo

Added a Leader column driven by the Amadeus checkbox. Marches past the end of the list showed a muted dash — later replaced when Márk supplied a crossed-out "No hero" icon.

---

## 16. The key rule change

**Márk:** *If the march don't have hero, the max capacity will be Squad deployment capacity otherwise Base deploy cap / march*

This made marches unequal, so the flat `T/n` split no longer worked. Replaced with **water-filling**: small-capped marches fill to their limit, surplus spreads across marches with room. The ratio is then applied *within* each march via largest-remainder, so every row's three numbers sum exactly to that march's total.

Verified across scenarios — e.g. Amadeus on, 6 marches, 139.31k base, 98.9k squad, Valora 10 → marches 1–3 get 136,950 each, marches 4–6 sit at their 98,900 cap, 707,550 total, archer-limited.

---

## 17. Layout iteration

A run of visual fixes, several of them corrections to earlier guesses:

- **Amadeus card** reworked into a proper hero card — portrait, name, role, Owned/Not owned pill, whole tile clickable, checkbox visually hidden but still keyboard-accessible.
- **Collision fix** — contents wrap so the pill drops below the name instead of overlapping in a narrow column.
- **Grouping** — split into labelled sections: Troops & ratio, Capacity, Heroes, Result, Check a march.

**Márk:** *I'm not satisfied the results. Can you iterate over again*

Attempted to install a headless browser to actually see the render; blocked by the sandbox network allowlist. Márk then supplied a screenshot, which exposed the real problems:

- `auto-fit` was packing four tiles per row and orphaning the fifth (Units) with a large void beside it → switched to fixed column counts
- The Ratio tile is inherently taller, making rows look stepped → moved to its own 2-up row with Marches
- An empty warning line reserved 16px of permanent height → collapsed when empty
- Accent colours were near-fully saturated (reverted at Márk's request — *I liked the old color*)
- Added table row hover

**Márk:** *Can you make those tiles to match each other* → rows back to `align-items:stretch` with tiles as flex columns; sliders sink to the bottom so they align with taller neighbours.

**Márk:** *These are not centralised* → all four result tiles centred horizontally and vertically.

---

## 18. Bottleneck highlighting

**Márk:** *Can you visually highlight if it is Deploy cap or Archer cap*

Colour-coded the Bottleneck tile and pointed it at the culprit: capacity-limited turns it green and marks both capacity inputs; troop-limited turns it red and marks that troop's input, captioned "Out of archers".

**Márk:** *Can you visually hightlight the note better?* → rebuilt the top note as a callout with a blue **!** badge, bold heading and muted body on a bordered card. Deliberately not tinted, since amber and red now carry live meaning.

**Márk:** *Can the deploy cap be green?* → recoloured capacity green everywhere it appears, so inputs, highlight and bottleneck state stay consistent.

---

## 19. Persistence

**Márk:** *Can you store the set values in cookie?*

Implemented with localStorage **and** a cookie fallback. Then:

**Márk:** *Do you think local storage is enough instead of cookie?*

Yes — and strictly better. The cookie fallback bought nothing: cookies fail on `file://` in Chrome, which was the exact case it was added for, while localStorage works there *and* on Pages. Cookies also ride along on every request, expire, drag consent questions into scope, and cap at 4KB.

**Márk:** *do it* → cookie path removed, leaving three short methods over localStorage with try/catch guards so blocked storage degrades quietly instead of breaking the calculator.

---

## 20. Final polish

**Márk:** *Swapping the ring for a small "LIMIT" badge in the tile corner* → green-on-green ring replaced with a solid **LIMIT** pill in the label row, so it can't overlap long labels and nothing shifts when it appears.

**Márk:** *Dead space in both slider tiles… the sliders have no scale* → sliders wrapped with `margin: auto 0` so leftover height splits evenly, plus end labels **1 … 6** and **0 … 10**.

---

## Final formula

```
T_troops = min(Inf / r_inf, Cav / r_cav, Arc / r_arc)

C_hero   = base deploy cap + 3,000 × savage_level    (marches with a leader)
C_none   = squad deployment capacity                 (marches without)

T = min(T_troops, Σ per-march caps)
```

Then water-fill `T` across the marches respecting each cap, and split each march by the ratio using largest-remainder so nothing drifts.
