# Lounge interface and optional Nodo dashboard

This fork adds a horizontal Favorites dock, wide app cards and featured nature/space wallpapers to AeroTizen. Application discovery, launching, HDMI inputs, favorites, persisted settings and the original startup/return service remain part of the existing runtime.

## Build and preview

Follow the Node version requirements in CONTRIBUTING.md:

```sh
npm ci
npm run build
npm run dev
```

The development server uses http://localhost:8019 at a 1920 × 1080 viewport. The generated Tizen application is in dist/launcher, including config.xml, index.html, css/, js/ and service/. Build outputs and signed packages are not source files and are ignored by Git.

To install the local build, replace TV_IP with your TV address and use your own AeroTizen CLI and certificates:

```sh
aerotizen --tv TV_IP install ./dist/launcher
aerotizen --tv TV_IP launch DclHome001.Home
```

## Optional Nodo dashboard

Set the complete endpoint URL under Settings → Nodo → URL. No server address is configured by default. A generic example is http://nodo.example/api/status; replace it with your own endpoint. The address is stored on the device, not written back to this repository. Existing saved preferences are retained.

The endpoint must return the read-only status schema expected by launcher/js/nodo.js: ok, system.cpu.percent, system.memory, system.disks and services.services. Byte counts are displayed in GiB/TiB. The compact dashboard shows three disks and twelve service names, with additional-item counts where applicable.

Requests use GET without authentication every 30 seconds while the launcher is visible. A failed request, invalid response or eight-second timeout clears stale values and displays “Nodo no disponible”. Hidden applications pause requests and refresh when visible again.

The widget retains AeroTizen's internet privilege and general network access declaration. The endpoint must enable CORS for the desktop browser preview. Do not embed credentials in endpoint URLs.

## Cards and navigation

Favorites uses a centered bottom dock, scrollable with Left/Right when necessary. Up returns to the current tab. Hold OK to open favorite actions; Move supports Left/Right and OK confirms the order. Applications uses three or five columns; Inputs has a separate view.

Curated SVG logos use watermark styling. Native app images retain their colors, with a translucent full-card background and a separate vertically centered, rounded square icon at the left. A sampled dominant color supplies the darker card gradient when canvas access is available. Missing icons retain initials and the application name.

Titles occupy the lower-right area. Whole words are measured against the available width: single-word names shrink without splitting; multi-word names wrap only at spaces.

## Featured wallpapers

Nature & Space chooses an image from Wikimedia Commons featured landscape/astronomy categories. The image must meet 1920 × 1080 minimum dimensions. Metadata is cached for 24 hours; the selected photograph is retained for 15 minutes when reapplying the background. A new launcher session may select another image. Network/image failures leave the fallback gradient.

Visible credits link to the image source and license. Images are loaded at runtime and are not bundled in the source or widget. Existing background preferences remain available under Settings → Still backgrounds.

References:

- https://www.mediawiki.org/wiki/API:Imageinfo
- https://www.mediawiki.org/wiki/API:Cross-site_requests
- https://github.com/DavidNgugi/samsung-tv-unlock (visual reference)

See the repository README and LICENSE for upstream credits and licensing.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run test:browser
```

Browser tests use simulated Nodo responses and reserved test domains. They do not require access to a private server. Physical TV behavior still requires device testing.
