# Eval cases

Each folder here is one product: its photos plus `label.json`, the answer a careful human
would give. `npm run eval` sends the photos to the model, compares the draft with the label
and writes `evals/report.md`.

```
evals/cases/
  kelvaro-travel-mug/
    1.jpg          front
    2.jpg          back, with the barcode digits
    label.json     the gold answer
```

- Photos are `1.jpg`, `2.jpg` and so on, in the order a person would take them. JPEG, PNG,
  WebP or GIF, at most 6 per case and under 1 MB each (a core test checks the size).
- The folder name is the case id. Use lowercase words with dashes; `npm run eval -- --case mug`
  runs every case whose id contains "mug".
- `npm run eval -- --check` validates every folder without calling the API and prints the
  image token estimate for a full run.

## label.json

```json
{
  "title": "Kelvaro TM-350 Insulated Travel Mug, 350 ml, Sage Green",
  "category": "kitchen_dining",
  "brand": "Kelvaro",
  "model": "TM-350",
  "condition": "new",
  "identifiers": [{ "kind": "ean", "value": "2004350135007" }],
  "tags": ["travel mug", "insulated", "stainless steel", "350 ml", "sage green", "leak-proof"],
  "notes": "Anything a reader of the eval should know."
}
```

`GoldLabel` in `evals/cases.ts` is the schema, and `loadCases()` rejects a label that does
not match it.

## How to label

Consistent labels matter more than perfect ones. A metric is only as good as the answers it
compares against.

- **title:** brand, model, product type, then the key variant: "Drevtek CD-18 Cordless Drill
  Driver, 18 V". The score is token overlap, so the exact wording matters less than the facts.
- **category:** one id from `src/lib/taxonomy.ts`. Read the descriptions there when two
  could fit, and write down your rule in `notes` so you decide the same way next time.
- **brand** and **model:** as printed on the product. Use `null` when nothing is visible.
  Do not fill in a brand you only know from the shape: the model is not supposed to either.
- **condition:** `new` (sealed or unused), `like_new` (used, no visible wear), `good` (light
  wear), `fair` (clear wear or small damage), `poor` (damaged or parts missing). Judge from
  the photos only, not from what you know about the item.
- **identifiers:** every code that is legible in the photos, as printed. Leave out a barcode
  you can only half read. The score is recall, so a missing gold identifier makes the eval
  more lenient, and an extra one makes it stricter.
- **tags:** 3 to 10 lowercase search terms a buyer would type.

## The starter cases are synthetic

The four cases here are rendered packaging for products that do not exist (Kelvaro, Sonavik,
Drevtek, Lumetta), front and back, so the eval runs on day one. Their EANs start with 2, the
range GS1 keeps for internal use, so they never collide with a real product, and their check
digits are valid. The seed catalogue in `data/catalog.seed.json` holds near-duplicates of
three of them, so duplicate detection has something to find.

Clean rendered text is much easier than a real photo. Expect high scores here and lower
ones once real products arrive. That gap is the point of P1-08.

## Add real products

**TODO(P1-08) Week 3: photograph and label 20 real products from home.**

Goal: an eval set that looks like real use, so the scores in the README mean something. The
synthetic cases only test reading clean text. Cover:

- [ ] varied categories: at least 8 different ones, including one that should be "other"
- [ ] some worn or damaged items, so condition is tested beyond "new"
- [ ] at least one product with no visible brand (its label has `"brand": null`)
- [ ] two pairs of near-duplicates: the same product in two colours or sizes, or two models
      from one brand
- [ ] a mix of angles: some cases with one photo, some with the barcode on a second photo
- [ ] at least one hard case: glare, a curved label, small print or a half-hidden barcode

When 20 real cases pass `npm run eval -- --check`, delete the bold TODO line above (it is the
marker `npm run progress` counts), run the full eval and commit `evals/report.md`.

The fastest way is through the app, which also tests the whole flow:

1. Open the app on your phone (`npm run dev -- -H 0.0.0.0`, then your computer's LAN
   address) and photograph each product with **Take photo**.
2. Press **Create entry**, correct every field until it matches the label rules above, and
   save it.
3. Run `npm run eval:import-corrections -- --all`. Each saved entry that came from a model
   draft becomes `evals/cases/saved-<entryId>/`, with its photos and a `label.json` built
   from what you saved. Without `--all`, only entries with at least one correction are
   imported.
4. Read every new `label.json` before you commit it. Rename the folders to something you can
   read, such as `oak-chopping-board`, if you like.

To add a case by hand, make the folder, copy in the photos and write `label.json`. Shrink
phone photos first so the repo stays small, for example with ImageMagick:

```bash
magick photo.jpg -auto-orient -resize "1568x1568>" -quality 85 -strip 1.jpg
```

## Privacy

Photos taken through the app are redrawn on a canvas before upload, which drops EXIF data,
GPS location included. Photos you copy in by hand keep it. Strip it before you commit
(`-strip` above does), and keep people, addresses and screens out of the frame: this folder
is public once you push it.
