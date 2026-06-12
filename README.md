# Duplicate Lizard

A small JavaScript app for finding duplicate keys in XML documents.

Open `index.html` in a browser, paste XML into the editor, then use `Scan` to find repeated sibling elements with the same XML key. Duplicate Lizard treats `name`, `key`, or `id` attributes as the key when present, then falls back to element name plus normalized text.

For logo, color, versioning, and publishing details, see [BRAND_AND_DEPLOYMENT.md](BRAND_AND_DEPLOYMENT.md).

## Features

- Parse and validate one XML document.
- Find duplicates under the same parent by XML key.
- Separate total duplicate-group occurrences from extra duplicates to clean up.
- Normalize whitespace and optionally ignore case.
- Copy or save the duplicate report as JSON.
- Open local `.xml` or `.txt` files.

## GitHub Pages

The intended Pages URL is:

```text
https://davidbreyer.github.io/duplicate-lizard/
```

Normal deployment flow after the GitHub repo exists:

```powershell
git add -- ...
git commit -m "Some change"
git push origin master
git push origin master:gh-pages
```

`master` stores the source/history. `gh-pages` is the branch GitHub Pages serves publicly.

## Release Stamp

The footer displays the current version:

```text
Version: YYYYMMDD-HHMM
```

The value lives in `script.js`:

```js
const appRelease = "YYYYMMDD-HHMM";
```

The same value is used for cache-busting query strings in `index.html`.
