# Halloween hero artwork

Created with the built-in image generation tool using each existing `assets/heroes/<file>.png` as the edit target. All ten original heroes and profile images are retained unchanged. The generated 1122 × 1402 transparent PNG sources live in `assets/holidays/halloween/heroes/`, with WebP exports beside them. Matching cropped avatar PNGs and WebPs live in `assets/holidays/halloween/profile/`.

The seasonal registry maps the `weeWoo` hero key to `weeandwoo` filenames; all other hero keys match their filenames. Cards retain the original geometry, portraits remain lazy, and Classic resolves to the original artwork.

## Final generation prompt set

One tool call per hero used `transparent_background: true` and `referenced_image_paths: [assets/heroes/<file>.png]`. The exact shared prompt template was:

```text
Use case: identity-preserve. Asset type: transparent portrait for an existing fantasy game hero card. Edit target: the attached original portrait of {name}. Primary request: create a polished Halloween costume variant of THIS SAME character. Costume: {costume} Style: preserve the original high quality stylized 3D mobile fantasy game render, soft dimensional shading and crisp detailed materials. Constraints: preserve identity, recognizable facial structure, expression, original body proportions, pose, camera angle, main silhouette and framing. Keep character occupying the same proportion of the portrait canvas, including the same crop at bottom, with all headwear within frame. Change costume/materials only as specified. Warm orange rim light, subtle violet fill light, no detached effects. Transparent background with clean alpha, NO background, no text, no border, no watermark, no extra characters, no blood or gore.
```

Substitute `{name}` and `{costume}` with the following exact values:

### Wee & Woo

- Source: `assets/heroes/weeandwoo.png`
- Generated portrait: `assets/holidays/halloween/heroes/weeandwoo.png`
- Costume prompt: a matching friendly pumpkin knight duo: blackened steel armor with burnt-orange trim, purple scarves, carved pumpkin emblems and a warm jack-o-lantern cannon muzzle. Keep BOTH characters, their blonde hair, the little one's blue eyes, smiles and relative positions.

### Amadeus

- Source: `assets/heroes/amadeus.png`
- Generated portrait: `assets/holidays/halloween/heroes/amadeus.png`
- Costume prompt: an elegant vampire knight: dark charcoal armor, antique copper trim, deep wine-purple cape, a small bat-shaped chest clasp and amber gemstone. Keep his silver swept-back hair, face and sword.

### Chenko

- Source: `assets/heroes/chenko.png`
- Generated portrait: `assets/holidays/halloween/heroes/chenko.png`
- Costume prompt: a fearless Halloween monster hunter: black and plum leather jacket, burnt-orange sleeves, pumpkin crest on cap and shoulder, a tiny silver bat pin. Keep her purple ponytail, face and backwards cap silhouette.

### Yeonwoo

- Source: `assets/heroes/yeonwoo.png`
- Generated portrait: `assets/holidays/halloween/heroes/yeonwoo.png`
- Costume prompt: a charming moon witch: her existing wide-brimmed hat becomes a gently pointed witch hat with purple and burnt-orange ribbon, midnight-purple and orange robes, tiny crescent fastener. Keep her black braid, face and hand touching the brim.

### Amane

- Source: `assets/heroes/amane.png`
- Generated portrait: `assets/holidays/halloween/heroes/amane.png`
- Costume prompt: an elegant autumn spirit: dark plum and ivory kimono with burnt-orange ties and subtle bat motifs, her existing parasol becomes dark purple with silver spiderweb embroidery. Keep her black hair, face, parasol silhouette and hand positions.

### Margot

- Source: `assets/heroes/margot.png`
- Generated portrait: `assets/holidays/halloween/heroes/margot.png`
- Costume prompt: a mischievous Halloween harlequin: black, plum and burnt-orange costume with antique copper trim, crescent and bat motifs, ivory half mask with orange star, small pumpkin bell on jester hat. Keep her curls, face, half mask and gesture.

### Luna

- Source: `assets/heroes/luna.png`
- Generated portrait: `assets/holidays/halloween/heroes/luna.png`
- Costume prompt: a moonlit Halloween huntress: midnight-purple cloak, charcoal armor with copper trim, orange gemstone, a crescent moon on her existing horned crown and fine web detailing on her bow. Keep her blonde hair, green eyes, pointed ears, horned headpiece silhouette, bow and pose.

### Vivian

- Source: `assets/heroes/vivian.png`
- Generated portrait: `assets/holidays/halloween/heroes/vivian.png`
- Costume prompt: a ghost pirate captain: black and aubergine coat, ivory blouse, copper trim, deep-purple feather in her existing tricorn, tiny pumpkin charm at belt and bat-shaped hat emblem. Keep her blonde curls, blue eyes, face, tricorn and pistol.

### Ava

- Source: `assets/heroes/ava.png`
- Generated portrait: `assets/holidays/halloween/heroes/ava.png`
- Costume prompt: a playful pumpkin rocketeer: black and purple outfit, burnt-orange scarf with small bat motif, her launcher becomes a glowing jack-o-lantern cannon with copper and charcoal casing. Keep her vivid pink ponytail, purple eyes, joyful face and shoulder launcher pose.

### Hilde

- Source: `assets/heroes/hilde.png`
- Generated portrait: `assets/holidays/halloween/heroes/hilde.png`
- Costume prompt: a mysterious moon oracle: dark plum hood and robes with ivory panels and antique copper trim, crescent moon embroidery, amber pendant and subtle spiderweb edging. Keep her white hair, face, eye-covering mask, hood silhouette and clasped hands.

## Web exports

Create square face crops from the generated sources, retaining alpha, and save the crop sources in `profile/`. The original generation remains untouched in `heroes/`. Run:

```sh
python3 scripts/export-artwork.py --holidays-only
```

Hero WebPs are bounded to 1000 pixels on the longest edge; avatar WebPs to 128 pixels. This option does not rewrite classic assets. Page decoration uses small native SVGs (`nightfall.svg` and `cobweb.svg`) rather than extra raster downloads.

## Capacity buff costumes

Valora and Mighty Bison were also generated with the built-in image generation tool, using their original `assets/buffs/*.png` as edit targets and `transparent_background: true`. Original assets are retained. New full-resolution PNGs and 960-pixel WebP exports live in `assets/holidays/halloween/buffs/`.

### Valora

- Source: `assets/buffs/valora.png`
- Generated source: `assets/holidays/halloween/buffs/valora.png`
- Web asset: `assets/holidays/halloween/buffs/valora.webp`

Final prompt:

```text
Use case: identity-preserve. Asset type: transparent bust portrait for a fantasy game capacity buff card. Edit target: the attached original Valora portrait. Primary request: create a Halloween costume variant of THIS SAME character to match a copper-orange and plum Halloween hero roster. Costume: a fierce pumpkin huntress costume: dark charcoal armor with antique copper trim, plum cloak replacing the yellow cloak, a small jack-o-lantern shoulder emblem, tiny bat-shaped clasp and warm amber accents. Keep her brown swept undercut and thick braid, amber eyes, white face stripe, confident expression, exposed shoulder, original face, proportions and bust pose. Style: preserve the original polished stylized 3D mobile fantasy game render, detailed materials, crisp edges and soft dimensional shading. Constraints: preserve identity, facial structure, expression, pose, camera, main silhouette, original bust crop and character scale on the square canvas. Change costume and accessories only as specified. Subtle orange rim lighting and violet fill. Keep all horns, hair and accessories within frame. Genuine transparent background and clean alpha. No scene, text, border, watermark, extra characters, gore or detached effects.
```

### Mighty Bison

- Source: `assets/buffs/mighty-bison.png`
- Generated source: `assets/holidays/halloween/buffs/mighty-bison.png`
- Web asset: `assets/holidays/halloween/buffs/mighty-bison.webp`

Final prompt:

```text
Use case: identity-preserve. Asset type: transparent bust portrait for a fantasy game capacity buff card. Edit target: the attached original Mighty Bison portrait. Primary request: create a Halloween costume variant of THIS SAME character to match a copper-orange and plum Halloween hero roster. Costume: a friendly Halloween vampire bison costume: a short rich plum vampire cape around the shoulders with a high collar behind the head, antique copper clasp bearing a small pumpkin emblem, and a tiny bat ornament resting in his existing hair between the horns. Keep his blue-grey fur, blue eyes, pink muzzle, both natural tan horns completely visible, fluffy dark mane, friendly smile, original proportions and exact head pose. He remains a recognizable bison, not a human. Style: preserve the original polished stylized 3D mobile fantasy game render, detailed materials, crisp edges and soft dimensional shading. Constraints: preserve identity, facial structure, expression, pose, camera, main silhouette, original bust crop and character scale on the square canvas. Change costume and accessories only as specified. Subtle orange rim lighting and violet fill. Keep all horns, hair and accessories within frame. Genuine transparent background and clean alpha. No scene, text, border, watermark, extra characters, gore or detached effects.
```
