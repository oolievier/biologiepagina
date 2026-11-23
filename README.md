# Biologiepagina.nl — vernieuwde site

Een volledig eigen, statische website voor biologiepagina.nl. Alle oude pagina's,
links, afbeeldingen en oefeningen zijn behouden; de presentatielaag is vervangen
door een zelf ontworpen redactioneel thema (papier, inkt, mosgroen en oker).

## Opbouw

- `theme/theme.css` — het volledig eigen thema, zonder framework of template.
- `theme/theme.js` — navigatie, zoeken en leesvoortgang.
- `theme/search-index.json` — gegenereerde zoekindex op basis van alle paginatitels.
- `tools/build.js` — zet de gespiegelde originele HTML-pagina's om naar het nieuwe thema.
- `tools/fetch-pages.js` — haalt gelinkte pagina's op die niet in de sitemap staan.
- `tools/fetch-missing.js` — haalt assetbestanden op die de spiegeling miste.
- `tools/check.js` — controleert links en tekstbehoud.
- `vercel.json` — kleine rewrite voor `/index.htm`.

De inhoudelijke bestanden (mappen als `Havo4/`, `Toetsen/`, `Images/` enz.) zijn
hetzelfde gebleven als op de originele site, zodat alle bestaande links werken.

## Thema

Geen kant-en-klaar template: de typografie, kleuren, navigatiebalk, tegels,
breadcrumbs, formulieren en oefenstijlen zijn speciaal voor deze site gemaakt.
Het ontwerp is gebaseerd op een studieboek/veldgids: fijne lijnen, serif-koppen,
geen gradiënten, geen standaard SaaS-kaarten en geen emoji-icoontjes.

## Bouwen

```bash
cd tools && npm install
node fetch-pages.js /pad/naar/gespiegelde/site
node build.js /pad/naar/gespiegelde/site ..
node fetch-missing.js .. /pad/naar/gespiegelde/site
node check.js /pad/naar/gespiegelde/site ..
```

## Hosting

De site is statisch en wordt via Vercel uitgeleverd.
