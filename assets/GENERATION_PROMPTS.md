# Harries Vogue — image generation brief for Codex

You are producing the photography for the Harries Vogue website: a Lagos shop (Abule Egba) selling lace and fabrics by the yard, lingerie and ready-to-wear. Each prompt below fills **one exact slot** in the new design ("split stage": one large photograph stays fixed on half the screen while the reading column scrolls, and changes chapter by chapter: the bolt → the yard → the cut → the occasion).

Work through the slots in order. Save each image at the path given. When all are done, run the build step at the end. Do not invent extra slots, and do not put text, logos or watermarks into any image.

---

## 0. Read this first: the standard every image must meet

**The goal is photographs that a fashion editor would believe were shot on set in Lagos by a professional photographer. Nothing may look generated.**

Apply all of these to every prompt (they are repeated inside each prompt so each one stands alone):

**Camera and rendering**
- Shot on a medium-format digital camera (Hasselblad X2D 100C or Fujifilm GFX100 II) or full-frame (Sony A1), with a real lens named in each prompt.
- Realistic depth of field for that lens and aperture: focus falloff in front of and behind the subject, no uniform blur.
- Natural colour grading close to Kodak Portra 400 / Fuji Pro 400H: warm but true skin, gentle highlight roll-off, no crushed blacks, no teal-and-orange.
- Fine, even sensor grain at 100% zoom. No digital smoothness, no HDR halos, no oversharpening.

**People (whenever a person appears)**
- Nigerian women of West African descent (Yoruba, Igbo, Edo features vary; do not repeat one face across slots). Ages as stated per slot.
- **Real skin, professionally lit and lightly retouched, never airbrushed:** visible pores across the nose, cheeks and forehead; fine vellus hair on the cheek and jawline catching the light; natural variation in tone (slightly deeper around the eyes and knuckles, warmer on the cheeks); subtle natural sheen on the forehead and cheekbones, not oily; the odd tiny mark or freckle left in. Lips with natural texture and fine lines.
- **Accurate dark skin rendering:** rich, deep brown and ebony tones with blue and red undertones as they really are. Never lightened, never grey, never orange. Expose for the skin.
- Natural hair and edges, or a properly tied gele (headwrap) with realistic folds and starch; no blurred or merged hairlines.
- Hands with five fingers, natural knuckles, realistic nails (neat, short or medium, natural or a single plain colour); fabric pressed by fingers must deform correctly.
- Real expressions: relaxed, mid-moment, eyes with natural catchlights matching the light source. No frozen stock smile, no perfectly symmetrical face.
- Bodies of real proportions and sizes as stated; clothing with real weight, creases and gravity.

**Fabric (the product is the hero)**

Harries Vogue sells the full range of ladies' fabrics, not only lace. Across the set, show silk, satin, chiffon, crepe, george, ankara, adire, aso-oke, velvet, organza, tulle, brocade, damask, sequin fabric and lace in roughly equal measure. Each must read as itself:

- **Silk (charmeuse, mikado, dupion):** liquid drape, a soft moving highlight that follows the folds, fine slubs in dupion, crisp body in mikado.
- **Satin (duchess, crepe-back, stretch):** a bright directional sheen with deep, smooth shadows; duchess satin holds stiff sculptural folds; crepe-back shows its matte reverse at a turned edge.
- **Chiffon and georgette:** sheer, layered, floating, light passing through, a faint crinkle texture in georgette; edges flutter.
- **Crepe:** matte, fine pebbled surface, heavy fluid drape.
- **George (Indian george wrapper fabric):** rich silk or taffeta base with dense metallic embroidery and appliqué, real thread relief.
- **Ankara (wax print):** crisp cotton with a slight waxy sheen, bold printed motifs with the fine crackle and slight colour registration offsets of real wax printing; print visible on both sides.
- **Adire:** indigo resist-dyed cotton, hand-made irregular patterns, slight tonal variation and soft edges where the dye bled.
- **Aso-oke:** hand-woven narrow strips sewn together, visible weave and slight irregularity, metallic threads if stated.
- **Velvet:** deep pile that changes shade with direction; crushed velvet shows mottled highlights.
- **Organza and tulle:** stiff sheer structure, crisp folds, a fine net (tulle) or a smooth glassy sheen (organza).
- **Brocade and damask:** woven pattern that appears and disappears with the light direction.
- **Sequin fabric:** every sequin a separate reflective disc with its own shadow, overlapping like scales.
- **Lace (French, cord, beaded, Swiss voile):** the net ground, raised cord outlines, embroidery threads, stones and beads catching light individually.
- Every fabric drapes with true weight and gravity; colours are believable dyed-textile colours, never neon.

**Set and place**
- Lagos, Nigeria, today: warm humid air with a soft haze in daylight; real interiors with plastered walls, tiled floors, wooden shelving, fluorescent or daylight mixed light where stated. Lived-in, clean and premium, not a slum cliché and not a Western studio pretending to be Lagos.

**Never (reject and regenerate if any appear)**
- Plastic, waxy or airbrushed skin; beauty-filter smoothing; doll eyes; over-whitened teeth.
- Extra or fused fingers, warped hands, melted jewellery, asymmetric earrings that don't match.
- Text, letters, logos, signs with writing, watermarks, labels on products, fake brand names.
- CGI or 3D-render look, illustration, painting, cartoon, anime.
- Over-saturated colour, neon, heavy vignettes, lens flare added for effect, HDR.
- Lightened or orange skin; Western fashion-week styling substituted for Nigerian dress.

**Brand colours to echo (in props and wardrobe, not as overlays):** black `#0A0A0A`, warm off-white `#FAFAF7`, and Harries Yellow `#FDCE02` (a rich marigold yellow). Yellow appears as one accent at most per image (a gele, a ribbon, a bolt), never everywhere.

**Text-safe areas.** Several slots will have text set beside or over them. Each prompt says where to keep the picture calm (plain wall, soft background); respect it.

---

## 1. Output rules

| Item | Rule |
| --- | --- |
| Format | JPEG, quality 95, sRGB. Do not upscale small images. |
| Size | At least the pixel size stated for the slot (long edge 2400 px or more for full-bleed slots). |
| Folder | `assets/photography/campaign/` for campaign and editorial; `assets/photography/products/<line>/<slug>/` for product stand-ins; `assets/photography/banners/` for banners; `assets/brand/social/` for the share image. |
| Name | Exactly the file name given in each slot. Lowercase, hyphens. |
| Variations | Generate 3 per slot, keep the best as the main file, keep the others as `<name>-alt1.jpg`, `<name>-alt2.jpg` so the art director can swap. |
| Record | Append one line per kept image to `assets/photography/MANIFEST.md`: slot id, file, the model/tool used, date, and "AI-generated". |

---

## 2. Home page: the stage (fixed half, crossfades between chapters)

All five stage images share **one framing family**: portrait 4:5, subject or action in the right two-thirds, a calm area in the left third (the reading column and the selvedge card sit beside it). They should feel like five frames from the same day in the same shop, with the same colour grade.

### HV-STAGE-01 — Hero: the woman in the lace
- **File:** `assets/photography/campaign/stage-01-hero.jpg` · **Size:** 2400 × 3000 (4:5 portrait)

> Editorial fashion portrait, photographed on a Hasselblad X2D with an XCD 90mm f/2.5 lens at f/3.2, 1/250s, ISO 100. A Nigerian woman in her early thirties, deep brown skin with cool undertones, stands three-quarters to camera against a warm off-white plaster wall in a Lagos atelier, late-afternoon daylight coming through a tall window on camera left and diffused by sheer cotton, with a large white bounce card on the right lifting the shadow side of her face. She wears a floor-length iro and buba in heavy ivory French lace embroidered with raised cord flowers and scattered with small clear stones; each stone catches the window light as a separate point. Her gele is a marigold-yellow (#FDCE02) aso-oke, tied high with crisp architectural folds and visible weave. Small gold stud earrings, matching. Her expression is calm and self-assured, lips relaxed, looking just past the lens. Skin is rendered with full real texture: visible pores on the nose and cheeks, fine vellus hair along the jaw catching the light, natural sheen on the cheekbones, slight tonal variation under the eyes; professional light retouching only, no airbrushing. The lace drapes with real weight, folding at the hip, net ground visible where it stretches. Composition: she occupies the right two-thirds of the frame, cropped mid-thigh; the left third is calm, softly lit plaster wall with a gentle falloff (text will sit beside this area). Colour grade like Kodak Portra 400, warm true skin, soft highlight roll-off, fine natural grain. No text, no logos, no jewellery distortion, no extra fingers, no plastic skin, no beauty filter, not CGI.

### HV-STAGE-02 — Chapter "The bolt": the wall of fabric
- **File:** `assets/photography/campaign/stage-02-bolt.jpg` · **Size:** 2400 × 3000 (4:5)

> Interior photograph of a premium fabric shop in Abule Egba, Lagos, shot on a Fujifilm GFX100 II with a GF 45mm f/2.8 at f/5.6, 1/60s, ISO 400, on a tripod. Floor-to-ceiling dark wooden shelves on the right two-thirds of the frame hold rolled bolts of fabric stacked horizontally, ends facing camera, a real mix of what a Lagos ladies' fabric shop sells: emerald and champagne silk satin with a soft sheen, wine and navy duchess satin, blush and ivory chiffon, black crepe, gold and royal-blue george with metallic embroidery, folded stacks of bold ankara wax prints and indigo adire, aso-oke, burgundy velvet, ivory organza, and a few bolts of French and sequin lace, with exactly one bolt of marigold-yellow (#FDCE02) silk at eye level as the single accent. Each fabric reads as itself at the bolt end: satin and silk catch the light, chiffon looks airy, velvet looks deep, ankara shows crisp print. You can see the cardboard tubes in the bolt centres, cut edges with loose threads, clear plastic sleeves on two bolts reflecting the light, and slight unevenness in the stacking as in a working shop. Light: soft daylight from a doorway on the left mixing with one warm practical lamp; gentle shadows between shelves. The left third shows a plain off-white plastered wall section and a corner of a wooden cutting table in soft focus (calm area for text). No people. No signs, no writing, no price tags, no labels with text. Realistic textile colours, no neon. Photographic, Portra-like grade, fine grain; not CGI, not a render.

### HV-STAGE-03 — Chapter "The yard": measuring silk satin
- **File:** `assets/photography/campaign/stage-03-yard.jpg` · **Size:** 2400 × 3000 (4:5)

> Close, top-down-angled detail photograph on a Sony A1 with an FE 90mm f/2.8 Macro G at f/4, 1/200s, ISO 200. On a pale wooden cutting table, a length of emerald-green silk satin is unrolled from a bolt, its liquid sheen sliding across the folds; a soft cloth tailor's tape measure in faded yellow lies along the selvedge edge, its markings legible only as tick marks (no readable numbers or letters in focus). A woman's hands (deep brown skin with visible knuckle creases, fine skin texture, short natural nails, one thin gold ring) hold the tape flat with one hand and smooth the satin with the other; the fabric dimples and ripples realistically under her fingers, the highlight bending around each ripple. At the top of the frame, a second bolt of blush chiffon spills over, sheer enough to see the table grain through it. A pair of black tailor's shears rests at the top edge, partly out of frame. Light: soft side window light from the left, gentle shadows to the right. Composition: the hands and tape occupy the right two-thirds; the left third is the plain wooden table surface with soft grain, slightly out of focus (calm area for text). Real textile detail, natural colour, fine grain, Portra-like grade. No text, no readable numbers, no logos, five fingers per hand, no warped fingers, not CGI.

### HV-STAGE-04 — Chapter "The cut": shears through ankara
- **File:** `assets/photography/campaign/stage-04-cut.jpg` · **Size:** 2400 × 3000 (4:5)

> Dramatic but natural detail photograph on a Hasselblad X2D with an XCD 120mm Macro f/3.5 at f/5, 1/160s, ISO 200. Heavy black steel tailor's shears mid-cut through a length of bold ankara wax print (deep indigo, ochre and marigold geometric motifs, with the fine crackle and slight registration offsets of real wax printing), the blades open at a narrow angle, a clean cut line visible behind them with a few loose cotton threads lifting from the cut edge. Beside it on the table, folded lengths of champagne duchess satin and burgundy velvet wait their turn, the satin's sheen and the velvet's deep pile clearly different. A woman's right hand (deep brown skin with true texture: visible pores on the back of the hand, natural knuckle creases, short natural nails) grips the shears; her left fingertips hold the cotton taut, the fabric creasing realistically around the pressure. The shears' steel shows real wear: fine scratches and a slightly darker pivot screw. Single soft key light from high on the left (a large softbox simulating window light), creating a defined but soft shadow of the blades on the fabric. Background: the wooden cutting table falling into soft shadow. Composition: shears and hands in the right two-thirds, diagonal from lower right to upper centre; left third is soft shadowed table (calm area for text). Photographic, true colour, fine grain. No text, no logos, no brand engravings on the shears, no extra fingers, not CGI.

### HV-STAGE-05 — Chapter "The occasion": the aso-ebi in silk, george and velvet
- **File:** `assets/photography/campaign/stage-05-occasion.jpg` · **Size:** 2400 × 3000 (4:5)

> Candid wedding-guest editorial on a Sony A1 with an FE 50mm f/1.2 GM at f/2, 1/320s, ISO 400, at an evening owambe in Lagos under warm festoon lights and the last blue of dusk. Three Nigerian women (ages about 28, 40 and 55, different face shapes and body types, deep and medium-deep brown skin) in coordinated aso-ebi made from different fabrics in one colour story: the nearest in a fitted emerald silk satin mermaid gown with soft directional sheen, the second in an emerald george wrapper and blouse with gold metallic embroidery, the eldest in an emerald velvet buba with a chiffon overlay, all with matching gele tied in three different styles, laughing together mid-conversation, one with her hand on another's arm. The nearest woman is in sharp focus on the right; the others fall gently out of focus behind her. Skin rendered with full real texture: pores, fine facial hair catching the warm light, natural sheen from the warm evening, laugh lines at the eyes of the eldest. Gold jewellery (matching earring pairs, bangles) with real reflections. The satin catches the festoon lights in long highlights; the george embroidery glints; the velvet absorbs light. Background: soft bokeh of warm string lights and blurred guests in other colours, no faces recognisable. Composition: subjects in the right two-thirds, cropped at mid-thigh; left third falls to dark blurred background with warm bokeh (calm area for text). Grade like Portra 800 pushed one stop: warm, true skin, deep but detailed shadows, fine grain. No text, no signs, no logos, no distorted hands, no plastic skin, not CGI.

---

## 3. Home page: the three lines (square plates beside the line tabs)

Square 1:1. The subject is centred with even breathing room; the background is a single flat tone so the three plates match each other.

### HV-LINE-FABRICS — the range, side by side
- **File:** `assets/photography/campaign/line-fabrics.jpg` · **Size:** 2400 × 2400

> Still-life fabric photograph on a Fujifilm GFX100 II with a GF 110mm f/2 at f/8, 1/125s, ISO 100, studio strobe through a large octabox from upper left with a white fill card on the right. Six lengths of fabric draped side by side over a hidden horizontal bar against a warm off-white (#FAFAF7) seamless paper backdrop, falling in deep natural folds to soft pools on the floor: champagne silk satin with a liquid moving highlight, blush chiffon floating in sheer layers, a bold indigo-and-ochre ankara wax print, royal-blue george with gold metallic embroidery, burgundy velvet with deep pile that darkens in the folds, and ivory French lace with clear stones. Each reads unmistakably as its own fabric; loose threads at one cut edge. Soft natural shadows on the backdrop. Centred composition with even space around. True textile colour, fine grain, crisp but not oversharpened. No people, no text, no labels, no logos, not CGI.

### HV-LINE-LINGERIE
- **File:** `assets/photography/campaign/line-lingerie.jpg` · **Size:** 2400 × 2400

> Tasteful lingerie editorial on a Hasselblad X2D with an XCD 80mm f/1.9 at f/2.8, 1/200s, ISO 100, soft north-window light. A Nigerian woman in her late twenties with deep brown skin, seated on the edge of an unmade linen bed in a sunlit Lagos apartment, wearing a black lace bralette and matching high-waisted brief with a sheer lace robe in warm ivory falling off one shoulder; the image is elegant and editorial, not explicit, framed from collarbone to mid-thigh with her face turned towards the window in soft profile. The lace pattern is crisp and readable against her skin; straps sit with real tension and slight indentation. Skin rendered with full real texture: visible pores on the shoulder and décolletage, fine body hair catching the backlight, natural tonal variation, soft sheen on the collarbone; professional light retouching only. Warm off-white walls and linen in the background, softly out of focus. Centred, calm composition. Portra-like grade, fine grain. Not explicit, no nudity, no text, no logos, no plastic skin, no warped hands, not CGI.

### HV-LINE-RTW
- **File:** `assets/photography/campaign/line-rtw.jpg` · **Size:** 2400 × 2400

> Fashion editorial on a Sony A1 with an FE 85mm f/1.4 GM II at f/2.8, 1/500s, ISO 100, natural Lagos daylight under light cloud. A Nigerian woman in her mid-thirties with deep brown skin and short natural hair, walking towards camera mid-stride along a clean, warm-toned plaster wall, wearing a tailored black wrap midi dress with a structured shoulder and a single marigold-yellow (#FDCE02) silk sash at the waist; low black block-heel sandals. The dress moves with her stride: real fabric weight, creases at the waist, hem swinging. Expression confident and present, looking just off camera. Skin with full real texture: pores, fine facial hair, natural sheen on the forehead and cheekbones, no airbrushing. Background: plain warm off-white wall with a soft shadow line from a palm frond out of frame. Centred composition, full-length figure with breathing room. Portra-like grade, fine grain. No text, no logos, no distorted limbs or feet, not CGI.

---

## 4. Home page: price sheet backdrop, buying section, footer

### HV-SHEET-BACKDROP — under the printed price sheet
- **File:** `assets/photography/campaign/sheet-backdrop.jpg` · **Size:** 3000 × 1700 (16:9-ish landscape)

> Extreme close-up textile photograph, filling the entire frame, on a Hasselblad X2D with an XCD 120mm Macro at f/8, 1/125s, ISO 100, raking soft light from the left. Champagne-gold French lace laid flat over black satin, so the lace pattern reads in gold against deep black; raised cord flowers, scalloped edges and small clear stones casting tiny shadows. The texture is even across the whole frame with no single focal point (a printed sheet will be centred on top of it). Slight natural unevenness in the lace. True colour, deep but detailed blacks, fine grain. No text, no logos, no objects, not CGI.

### HV-BUY-PARCEL — tall photo beside the buying questions
- **File:** `assets/photography/campaign/buy-parcel.jpg` · **Size:** 2100 × 2800 (3:4 portrait)

> Still life on a Fujifilm GFX100 II with a GF 80mm f/1.7 at f/4, 1/125s, ISO 200, soft window light from the right. On a pale wooden table in a Lagos shop, five yards of emerald silk satin folded neatly into a flat rectangle, its sheen catching the window light, stacked on a folded length of indigo adire; the satin half wrapped in crisp black tissue paper and tied with a thin marigold-yellow (#FDCE02) ribbon in a simple bow; beside it a plain black paper bag with rope handles (no print, no logo) and a folded paper slip with no readable writing. The tissue paper has real creases; the adire shows hand-dyed irregular pattern at its folded edge. Background: plastered off-white wall, softly out of focus. Composition: parcel in the lower two-thirds, calm wall above. Portra-like grade, fine grain. No text, no logos, no readable writing, not CGI.

### HV-BUY-HANDOFF — small square overlapping the tall photo
- **File:** `assets/photography/campaign/buy-handoff.jpg` · **Size:** 1600 × 1600

> Close detail on a Sony A1 with an FE 50mm f/1.2 at f/2.8, 1/250s, ISO 200, daylight at a shop doorway in Lagos. Two pairs of hands passing the same black paper bag with rope handles from one to the other: the giver's hands deep brown with short natural nails and a thin gold ring, the receiver's hands medium-brown with neat burgundy nails and a gold bangle. Real skin texture on both: knuckle creases, fine lines, visible pores on the backs of the hands. The bag has real paper creases, no print. Background: soft-focus doorway with warm daylight. No faces. No text, no logos, five fingers per hand, no warping, not CGI.

### HV-FOOTER — the last photograph, wordmark across it
- **File:** `assets/photography/campaign/footer-owambe.jpg` · **Size:** 3200 × 1800 (landscape)

> Wide editorial photograph on a Hasselblad X2D with an XCD 38mm f/2.5 at f/4, 1/200s, ISO 800, at golden hour on a Lagos rooftop terrace after a wedding. A group of six Nigerian women and two men in matching marigold-and-black aso-ebi (women in lace bubas and gele, men in agbada with fila) stand in a loose line in the middle band of the frame, laughing and adjusting each other's outfits, backlit by low warm sun with rim light on the gele and shoulders. Faces natural and varied, ages 25 to 60, real skin texture visible on the nearest figures, no faces in the top or bottom third. The middle band holds all the interest; the top third is soft evening sky with haze over the Lagos skyline (low and blurred), the bottom third is the terrace floor in soft shadow (white text will sit at the top and bottom, and the image will be darkened). Portra-like grade, warm, fine grain. No text, no signs, no logos, no distorted hands, not CGI.

---

## 5. Line pages: banners (Fabrics, Lingerie, Ready-to-Wear)

Landscape 12:5, subject on the right half, calm left half for the page title.

### HV-BANNER-FABRICS
- **File:** `assets/photography/banners/line-fabrics-banner.jpg` · **Size:** 3000 × 1250

> Wide interior photograph on a Fujifilm GFX100 II with a GF 32-64mm at 40mm, f/5.6, ISO 400. A woman's hands (deep brown, natural nails) unroll a bolt of wine-red duchess satin across a long wooden cutting table in a Lagos fabric shop; the satin cascades over the table edge on the right half of the frame in stiff, glossy folds, beside a loosely piled length of ivory chiffon and a folded stack of ankara prints. Bolts of silk, crepe, george and velvet on dark shelves behind, softly out of focus. The left half is calm: plain off-white wall and the near end of the table in soft light. Portra-like grade, fine grain. No text, no logos, no signs, not CGI.

### HV-BANNER-LINGERIE
- **File:** `assets/photography/banners/line-lingerie-banner.jpg` · **Size:** 3000 × 1250

> Still life on a Hasselblad X2D with an XCD 90mm at f/4, soft window light from the right. On warm ivory linen, a black lace bralette and matching brief laid flat beside a folded ivory silk robe and a single marigold-yellow (#FDCE02) satin ribbon, arranged on the right half of the frame; the lace pattern crisp, the silk with soft directional sheen and real creases. Left half: plain linen texture, calm. No person. No tags, no text, no logos, not CGI.

### HV-BANNER-RTW
- **File:** `assets/photography/banners/line-rtw-banner.jpg` · **Size:** 3000 × 1250

> Fashion photograph on a Sony A1 with an FE 35mm f/1.4 GM at f/2.8, natural daylight. A Nigerian woman with deep brown skin in a tailored ivory linen co-ord (cropped jacket and wide-leg trousers) leaning against a warm off-white plaster wall on the right half of the frame, one hand in a pocket, relaxed, looking away; fabric with real creases at the elbow and knee. Skin with full real texture, no airbrushing. Left half: the same plain wall in soft light. Portra-like grade, fine grain. No text, no logos, no distorted limbs, not CGI.

---

## 6. Campaign banners (seasonal; desktop and phone versions)

Each campaign has a wide desktop image (subject right, calm left for a headline added in code) and a phone image (subject lower two-thirds, calm top third). No text in the images.

### HV-CAMPAIGN-WEDDING — wedding / aso-ebi season
- **Desktop:** `assets/photography/banners/campaign-wedding-desktop.jpg` · 3200 × 1200
- **Phone:** `assets/photography/banners/campaign-wedding-phone.jpg` · 1350 × 1800

> Editorial photograph on a Hasselblad X2D with an XCD 90mm at f/2.8, daylight under a white canopy at a Lagos garden wedding. A Nigerian bride's party: two bridesmaids in champagne beaded lace with matching gele adjust the bride's veil-free gele of ivory aso-oke; the bride (early thirties, deep brown skin) in ivory French lace with stones, eyes closed, smiling softly. Real skin texture on all faces (pores, fine hair catching the backlight, natural sheen); beads and stones sparkle as individual points. Soft-focus greenery behind. For the desktop version, keep the group in the right half and the left half as soft canopy light and blurred greenery; for the phone version, keep the group in the lower two-thirds and the top third as soft canopy light. Portra-like grade, fine grain. No text, no logos, no distorted hands, not CGI.

### HV-CAMPAIGN-FESTIVE — Christmas / end-of-year
- **Desktop:** `assets/photography/banners/campaign-festive-desktop.jpg` · 3200 × 1200
- **Phone:** `assets/photography/banners/campaign-festive-phone.jpg` · 1350 × 1800

> Warm evening editorial on a Sony A1 with an FE 50mm f/1.2 at f/1.8, at a Lagos family dinner in December lit by warm pendant lights and candles. A Nigerian woman in her forties with deep brown skin wears a deep emerald velvet-and-lace wrap dress and gold earrings, mid-laugh as she sets down a dish; behind her, blurred family members and warm bokeh. Real skin texture, natural warm sheen, laugh lines. Desktop: subject in the right half, left half warm dark bokeh. Phone: subject in the lower two-thirds, top third warm dark bokeh. Portra 800 grade, fine grain. No Christmas text, no logos, no signs, not CGI.

### HV-CAMPAIGN-EID — Eid / Sallah
- **Desktop:** `assets/photography/banners/campaign-eid-desktop.jpg` · 3200 × 1200
- **Phone:** `assets/photography/banners/campaign-eid-phone.jpg` · 1350 × 1800

> Morning editorial on a Fujifilm GFX100 II with a GF 110mm f/2 at f/2.8, soft early sunlight in a Lagos courtyard. A Nigerian woman in her late twenties with deep brown skin wears a flowing ivory abaya-style kaftan in fine embroidered voile with a matching marigold-yellow (#FDCE02) silk scarf loosely framing her face, holding prayer beads, serene and smiling slightly. The voile is translucent where light passes through, embroidery crisp. Real skin texture with pores and fine facial hair catching the light. Desktop: subject in the right half, left half calm courtyard wall in soft light. Phone: subject in the lower two-thirds, top third calm wall. Portra-like grade, fine grain. No text, no logos, not CGI.

---

## 7. Product images: DESIGN STAND-INS ONLY

These let the design be seen with realistic products until the real stock is photographed. **They must never be used to sell a real product:** before a real product goes live, its own photos replace these. Name each folder after the stand-in product.

Each stand-in product gets **three images**, all 1600 × 2000 (4:5), shot as the real product photos will be: warm off-white `#FAFAF7` seamless backdrop, soft even studio light (large octabox from upper left, fill card right), true colour, fine grain, no text, no tags, no logos, not CGI.

- `01-front.jpg`: the fabric folded and draped or the garment on a form or model, front view.
- `02-drape.jpg`: draped over a hidden form or worn on a model in movement, showing how it falls.
- `03-macro.jpg`: extreme macro of the texture filling the frame (cord, beads, weave, lace edge).

**Template (fill the brackets per product):**

> Professional e-commerce product photograph on a Fujifilm GFX100 II with a GF 110mm f/2 at f/8, 1/125s, ISO 100, against a warm off-white (#FAFAF7) seamless paper backdrop, lit by a large octabox from upper left with a white fill card on the right, giving soft even light and a gentle natural shadow. Subject: [FABRIC/GARMENT DESCRIPTION], [VIEW: neatly folded with one end draped over a hidden stand / draped over a hidden dress form falling to the floor / worn by a Nigerian woman (deep brown skin, full real skin texture with pores and fine hair, no airbrushing) in natural movement / extreme macro filling the frame]. Every [stone / sequin / bead / cord / weave] is rendered individually with true texture and correct shadows; fabric falls with real weight and creases; true textile colour. Centred, consistent framing. Fine grain, crisp but not oversharpened. No text, no labels, no tags, no logos, no props, not CGI.

**Stand-in products to make** (folder → description):

| Folder | Description to put in the template |
| --- | --- |
| `products/fabric/champagne-silk-satin/` | champagne silk charmeuse satin with a liquid moving highlight |
| `products/fabric/emerald-duchess-satin/` | emerald duchess satin, heavy, holding stiff sculptural folds with a bright sheen |
| `products/fabric/ivory-silk-mikado/` | ivory silk mikado, crisp body, subtle slub texture |
| `products/fabric/blush-chiffon/` | blush-pink chiffon, sheer and floating, layered to show transparency |
| `products/fabric/black-crepe/` | black crepe, matte pebbled surface, heavy fluid drape |
| `products/fabric/royal-blue-george/` | royal-blue george with dense gold metallic embroidery and appliqué |
| `products/fabric/indigo-ochre-ankara/` | indigo and ochre geometric ankara wax print with fine crackle |
| `products/fabric/indigo-adire/` | hand-dyed indigo adire cotton with irregular resist pattern |
| `products/fabric/burgundy-velvet/` | burgundy velvet with pile that changes shade with direction |
| `products/fabric/ivory-organza/` | ivory organza, crisp and sheer with a glassy sheen |
| `products/fabric/gold-brocade/` | gold brocade with a large woven floral pattern |
| `products/fabric/wine-sequin/` | wine-red sequin fabric, overlapping sequins like scales |
| `products/fabric/ivory-french-lace/` | ivory French lace with raised cord flowers and scattered clear stones |
| `products/fabric/indigo-aso-oke/` | hand-woven indigo-and-ivory aso-oke with narrow strips and slight weave irregularity |
| `products/lingerie/black-lace-bralette-set/` | black lace bralette and matching high-waisted brief (worn on model for 02-drape) |
| `products/lingerie/champagne-silk-slip/` | champagne silk satin slip dress with fine straps |
| `products/lingerie/ivory-silk-robe/` | ivory silk robe with lace trim at the cuffs |
| `products/rtw/emerald-satin-wrap-dress/` | emerald satin wrap dress with a draped neckline |
| `products/rtw/black-crepe-midi/` | tailored black crepe midi dress with a structured shoulder |
| `products/rtw/ankara-two-piece/` | ankara print cropped jacket and wide-leg trouser two-piece |
| `products/rtw/ivory-linen-coord/` | ivory linen cropped jacket and wide-leg trouser co-ord |

---

## 8. Share image (WhatsApp, Instagram and Google link previews)

### HV-OG
- **File:** `assets/brand/social/og-default-1200x630.jpg` · **Size:** 2400 × 1260 (export also at 1200 × 630)

> Editorial photograph on a Hasselblad X2D with an XCD 90mm at f/3.2, warm late-afternoon window light. A close crop of a Nigerian woman's shoulder and neck in a draped champagne silk satin gown with a soft liquid highlight, and the edge of a marigold-yellow (#FDCE02) aso-oke gele, filling the right two-thirds of the frame; deep brown skin with full real texture (pores, fine hair catching the light, natural sheen). Left third: warm off-white plaster wall, calm (the logo is added in code). Portra-like grade, fine grain. No text, no logos, not CGI.

---

## 9. Optional: one moving picture (only if a video tool is available)

### HV-LOOP-LACE
- **File:** `assets/video/lace-loop.mp4` (H.264, 1920 × 2400 portrait, 6–8 s, seamless loop, no audio) and `assets/video/lace-loop.webm`
- **Poster:** first frame as `assets/video/lace-loop-poster.jpg`

> Slow, almost still macro video of ivory French lace with clear stones gently moving in a soft breeze from an open window, light shifting slowly across the stones so they twinkle one at a time; shallow depth of field, focus breathing slightly; warm daylight; seamless loop with no visible cut. Photographic, true colour, fine grain. No text, no people, no logos, not CGI.

If no video tool is available, skip this slot; the site uses a slow drift on the hero photograph instead.

---

## 10. After generating: build the web sizes

From the project root:

```
corepack pnpm images
```

This makes the 400 / 800 / 1200 / 2000 px AVIF and WebP versions the site loads and puts them in `apps/storefront/public/media/`. Then check each image at 100% zoom against section 0. Regenerate any that fail before the site goes live.

## 11. Quality checklist (review every kept image)

- [ ] At 100% zoom, skin shows pores and fine texture; no smoothing; tone not lightened.
- [ ] Hands: five fingers each, natural joints, nails real.
- [ ] Jewellery: earrings match, no melted metal.
- [ ] Fabric construction visible (net, cord, beads, weave); stones and sequins are individual highlights.
- [ ] No text, letters, numbers, logos or watermarks anywhere (check signs, bags, tapes, tags).
- [ ] The calm text-safe area is where the slot says.
- [ ] Colour grade matches the other images in its group (the five stage images especially).
- [ ] It looks like a photograph from a real shoot in Lagos, not a render.
