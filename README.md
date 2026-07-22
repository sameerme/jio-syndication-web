# JIO Syndication Form — Web

A browser-based version of the JIO Syndication Form. No install, no Python,
no Gatekeeper prompts — everything runs client-side and nothing is ever
uploaded anywhere.

Live at: https://sameerme.github.io/jio-syndication-web/


## HOW TO USE

1. Open the link above in any modern browser (Chrome, Safari, Firefox, Edge).

2. For each show, type the **EPISODE NUMBER** (middle column) and the
   **SYNOPSIS/NOTES** (right column), then click **Submit**.

3. Your browser downloads **output.zip**. Unzip it to get an `output`
   folder containing, per show:
     - the `_SA.jpg` still, renamed with the episode number
       (e.g. `Atuta_Bandhana_EP607_SA.jpg`)
     - the CSV, renamed with the episode number, with `FileName` /
       `EpisodeName` / `EpisodeSynopsis` / `EpisodeNumber` filled in

   `_AA.jpg` and `_BA.jpg` are intentionally **not** included.

4. Leaving a show's number blank leaves that show's files unrenamed in
   the zip (still included, just without an episode number appended).


## REQUIREMENTS

- Any modern browser. No Python, no internet access needed once the page
  has loaded (the template images/CSVs are bundled into the page itself).


## TROUBLESHOOTING

- **Nothing downloads on Submit**: check your browser hasn't blocked the
  download (look for a blocked-download icon in the address bar) and
  allow it, then click Submit again.

- **Page takes a moment to load**: the page bundles all template
  images/CSVs (~4 MB) on first load so Submit works instantly and
  offline afterward — this is a one-time cost per visit.


## UPDATING THE SITE

Source lives in this repo (`index.html`, `app.js`, `assets.js`,
`jszip.min.js`). `assets.js` is generated from the `refs/` folder in the
[Mac app source](../jio-syndication) — regenerate it there if the
template images/CSVs change, then commit and push; GitHub Pages
redeploys automatically from the `main` branch.
