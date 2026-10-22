# cv-portfolio-msd

My portfolio page: a voxel cluster that grows on its own and comes apart into my projects.

Every visit grows a new cluster from a random seed, anywhere from 5 to 30 room blocks (add `?seed=12345` to the URL to get one back). Scrolling takes it apart into five layers, and each layer opens one project:

| Layer (top to bottom) | What it is in the model | Project |
| --- | --- | --- |
| Windows | the windows | Hyperbuilding + Forma |
| Rooms | the walls | Sensi |
| Slabs | the floor slabs | Computational bucketing (Speckle Automate) |
| Structure | the skeleton: a thin frame in every room, columns under overhangs | Stadium façade: BIM to fabrication |
| Landscape | the site | Island topography + urbanism |

Behind it, the sky shows Barcelona's weather right now (from [Open-Meteo](https://open-meteo.com), no key needed): a red sun, clouds, rain, snow, fog or a storm. In dark mode the sun becomes a moon and the windows light up. Preview any weather with `?weather=` and one of `clear`, `clouds`, `overcast`, `fog`, `drizzle`, `rain`, `pour`, `storm`, `snow`.

Dark mode follows the system setting until you use the toggle in the header; the choice is then remembered in that browser.

Each room is split into the five layers: the landscape under it, its skeleton (a thin frame inside the block, and columns under overhangs), its floor slab, its walls and its windows. Choosing a layer highlights it and turns the others see-through with a pixel dither; scrolling takes the cluster apart. Drag the model, or use the compass, to turn it.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Where things are

```
content/            text for the site: edit these, not the components
  site.json         name, tagline, email, links, "What I do"
  projects.json     one entry per project, tied to a layer
  layers.json       layer names, bottom to top
  cv.json           CV page
src/weather.js      fetches Barcelona's weather and maps it to a sky
src/components/
  WeatherSky.vue    the pixel sky behind the cluster
src/stores/theme.js light and dark mode
src/three/
  aggregate.js      the growth algorithm (seeded stochastic aggregation)
  VoxelStage.js     Three.js renderer: pixel-art pass, explode, picking
  shaders.js        voxel and outline shaders
src/pages/          Home, Project, CV, Contact, NotFound
src/styles/         tokens.css (same colours as the Figma file), base.css
```

### Adding project images

Put files in `public/projects/<slug>/` and list them in `projects.json`:

```json
"images": [
  { "src": "/projects/sensi/plan.png", "alt": "Floor plan scored by sense", "caption": "Each room scored across six senses." }
]
```

### Changing how it grows

`src/three/aggregate.js` grows the cluster one room at a time. A room is a 3×3×3 block of voxels on a coarse grid: its bottom row is the slab, the rest are walls and windows, and a thin frame runs inside it. New rooms attach beside or on top of a recent one; side by side they keep a one-voxel joint, and sometimes they merge, filling the joint so two blocks read as one bigger room. Columns appear only under an overhang, and the landscape grows to cover the whole footprint. The knobs are in the `Aggregator` constructor: `maxRooms` (picked from the seed, 5 to 30 blocks, unless you pass one), `reach`, `levels`, `mergeChance`. The same logic can be ported to Grasshopper: the output is just lists of `[x, y, z, colour]` per layer.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages through `.github/workflows/deploy.yml`. One-time setup: in the repo settings, under **Pages**, set the source to **GitHub Actions**.

Stack: Vite, Vue 3, Pinia, Vue Router, Three.js. Fonts: Pixelify Sans and Inter.
