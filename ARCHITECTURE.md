# Examlet architecture

Examlet is a flashcard app that runs entirely in the browser. It has no backend: a static bundle built by Vite serves the UI, and all data lives in the browser's IndexedDB.

```
┌──────────────────────── Browser ────────────────────────┐
│                                                          │
│  pages/  ──uses──▶  components/   (presentational)       │
│    │                                                     │
│    ├──uses──▶  hooks/  (useRoute, useAsync, useAutosave, │
│    │                    RepositoryContext)               │
│    │                                                     │
│    └──uses──▶  lib/   (pure logic, no React)             │
│                  ├─ session.ts        study state machine│
│                  ├─ latex.ts          math tokenizer     │
│                  ├─ mathSymbols.ts    symbol palette     │
│                  ├─ studysheetFile.ts import / export    │
│                  ├─ editor.ts         editor draft logic │
│                  ├─ routes.ts         hash routing       │
│                  └─ repository.ts ──▶ db.ts ──▶ IndexedDB│
└──────────────────────────────────────────────────────────┘
```

## Layers

| Layer | Folder | Rules |
| --- | --- | --- |
| Domain logic | `src/lib` | Plain TypeScript with no React. Each module has a colocated `*.test.ts`. |
| Hooks | `src/hooks` | Small adapters between React and `lib` (routing, async loading, autosave, dependency injection). |
| Components | `src/components` | Presentational. Data comes in through props and events go out through callbacks. Components never touch storage. |
| Pages | `src/pages` | One page per route. Pages connect hooks, `lib`, and components. |
| Styles | `src/styles` | `theme.css` defines the design tokens and `app.css` styles the components. |

Dependencies flow downward only: pages → components/hooks → lib. Nothing in `lib` imports React.

## Data model (`src/lib/types.ts`)

- **Studysheet**: `{ id, title, description, createdAt, updatedAt }`. A named group such as "Modern Algebra Exam 2".
- **Card**: `{ id, sheetId, term, definition, position }`. `position` keeps the author's order.

## Storage (`src/lib/db.ts`, `src/lib/repository.ts`)

- The database is `examlet` (schema version 1) with two object stores:
  - `studysheets`, keyed by `id`
  - `cards`, keyed by `id`, with a `bySheetId` index
- Cards have their own store instead of being embedded in the sheet. That way the home page can count cards through the index without loading every definition, and one large card doesn't force a rewrite of the whole sheet record.
- `db.ts` is the only file that uses the raw IndexedDB API. It wraps requests and transactions in promises and holds the `onupgradeneeded` migrations. To change the schema, bump `DB_VERSION` and add an `if (oldVersion < N)` block.
- `repository.ts` exposes a small `StudysheetRepository` interface: `listSummaries`, `get`, `save`, `delete`. `save` writes the sheet and replaces its cards in a single readwrite transaction, so a sheet is never stored half-updated.
- The repository reaches React through `RepositoryProvider` (`hooks/RepositoryContext.tsx`). Tests inject a repository backed by a uniquely named database through `fake-indexeddb`.
- On startup, `requestPersistentStorage()` asks the browser not to evict the data under storage pressure. The browser may decline.
- When another tab or window opens the database at a newer schema version (after an app update), this connection gets `versionchange`. It closes so the upgrade can go ahead, then reloads the page into the new version. A `blocked` open is not treated as an error, because it finishes once the older connections close.

## Editing and autosave

`SheetEditorPage` keeps an `EditorDraft` in local state. Every edit is passed to `useAutosave`, which debounces for 500 ms and then calls `repository.save(toStored(draft))`.

- `toStored` (in `lib/editor.ts`) skips blank rows, renumbers `position`, and gives empty titles a default name. Blank rows stay visible in the editor but are never stored or studied.
- A new sheet starts at `#/sheets/new/edit`. On its first save the URL is replaced with the real id. The page tracks the loaded id, so this URL swap doesn't reload the page.
- Pending saves are flushed when the page unmounts, on `pagehide`, and as soon as the page is hidden (`visibilitychange`). Mobile systems often kill a backgrounded app without firing `beforeunload`. `beforeunload` still warns before closing a tab with unsaved edits.

## Study sessions (`src/lib/session.ts`)

A session is a pure reducer used through `useReducer`:

```
createSession(cards) ─▶ { deck: shuffled copy, index, revealed, grades }
actions: flip | grade(right|wrong) | back | restart(cards)
selectors: currentCard, isComplete, scoreSession, missedCards
```

- The deck is shuffled with Fisher–Yates (`lib/shuffle.ts`). The random source can be injected, so tests are deterministic.
- A card can only be graded after it has been revealed. Grading advances to the next card face-down.
- **Direction** (`term` or `definition`) only controls which field goes on the front of the `Flashcard`. It comes from the URL (`?show=definition`), so both modes can be linked and bookmarked.
- When the deck is finished, `ScoreSummary` shows the percentage, the right and wrong counts, and the missed cards. "Retry missed" restarts the session with only those cards.
- Keyboard: Space flips the card. Once the card is revealed, `1` marks it missed and `2` marks it correct.

## Large definitions

- Both faces of the `Flashcard` sit in the same CSS grid cell, so the card grows to fit the taller face. Faces have a maximum height (`min(70vh, 720px)`) and scroll internally after that.
- `sizeClassFor(text)` picks a font size from the text length. Long text (over 320 characters) switches to a smaller, left-aligned paragraph style.
- Editor textareas grow with their content (`AutoGrowTextarea`).

## LaTeX (`src/lib/latex.ts`, `src/components/MathText.tsx`)

- `parseMath` splits text into text and math segments. It supports `$…$` and `\(…\)` for inline math, `$$…$$` and `\[…\]` for display math, and `\$` for a literal dollar sign. An inline `$` must hug its content, so prose like "$5 and $10" stays plain text.
- `mathRanges` reports where each math body sits in the source, so the editor can tell whether the caret is inside math.
- `MathText` renders text segments as React text nodes, which are always escaped. Math segments go through `katex.renderToString` with `trust: false`, which disables `\href`, `\includegraphics`, and similar commands, and `throwOnError: false`, which shows bad LaTeX in red instead of crashing. KaTeX output is the only HTML the app injects.

### Math input (`src/lib/mathSymbols.ts`, `src/components/MathPalette.tsx`)

Cards stay plain text. The editor makes math easier to write without hiding the LaTeX:

- **Live preview**: any field that contains math shows a rendered preview under it. Fields without math show nothing extra.
- **Symbol palette**: a **Σ** button next to each field label appears when the card has focus or the pointer is over it. It opens a palette with categories and search. Each tile is rendered with KaTeX, and the status line shows the tile's LaTeX, so authors learn the code as they go.
- **Insertion** (`planInsertion`): outside math the LaTeX is wrapped in `$…$`. Right after a closing `$` it joins that math. `□` in a template marks a blank: the caret lands on the first one, and any selected text fills it. The editor applies the edit with `execCommand('insertText')`, which keeps the browser's undo history, and falls back to a controlled update where that command is unavailable (for example in jsdom).

 (`src/lib/studysheetFile.ts`)

Files use the `.studysheet.json` extension:

```json
{
  "format": "examlet.studysheet",
  "version": 1,
  "exportedAt": "2026-10-31T00:00:00.000Z",
  "studysheet": {
    "title": "Modern Algebra Exam 2",
    "description": "…",
    "cards": [{ "term": "…", "definition": "…" }]
  }
}
```

- Exports contain no internal ids. Every import creates a new sheet with fresh ids, so importing the same file twice never overwrites anything.
- Imports are validated field by field. Malformed files raise a `StudysheetFileError` with a readable message, which the home page shows.
- Downloads are generated in the browser with a `Blob` and an object URL (`lib/download.ts`).
- A sample file is in `examples/`.

## Routing (`src/lib/routes.ts`)

Routing is hash-based, so the build is a pure static bundle that works on any static host or sub-path without rewrite rules.

| Hash | Page |
| --- | --- |
| `#/` | Home: list, create, import, export, delete |
| `#/sheets/:id/edit` | Editor (`:id` = `new` creates a sheet) |
| `#/sheets/:id/study` | Study, term first |
| `#/sheets/:id/study?show=definition` | Study, definition first |

`useRoute` subscribes to `hashchange` through `useSyncExternalStore`.

## Offline and installation (`pwa/`, `src/lib/serviceWorker.ts`)

Examlet is a Progressive Web App. It installs on Windows, macOS, Linux, Android, and iOS, and after the first visit it runs with no network.

- **Manifest**: `public/manifest.webmanifest`. All paths are relative (`start_url` and `scope` are `./`), so it works on any sub-path like the rest of the build.
- **Icons**: `public/icons/` holds PNGs rendered from `public/favicon.svg`, the same mark the header shows. There is an `any` set (192 and 512 px, transparent background), a maskable icon (the mark inside the 80% safe zone on `--bg`), and an opaque 180 px `apple-touch-icon` for iOS, which ignores manifest icons and SVG. After changing the favicon, run `sh scripts/generate-icons.sh` (macOS, uses `sips`).
- **Service worker**: `pwa/sw.js` is a template. The `examlet:service-worker` Vite plugin (`pwa/serviceWorkerPlugin.ts`) runs at build time and fills it with:
  - the list of build and `public/` files to precache. WOFF and TTF fonts are left out because every browser with service workers uses KaTeX's WOFF2 copies.
  - a version, which is a hash of those files' contents and the worker code.

  The result is emitted as `dist/sw.js`.
- **Caching**: the worker precaches everything on install and serves it cache-first. Every navigation in scope gets the cached app shell, which is safe because routing is hash-based.
  - The shell is precached under the scope root (`./`), not `index.html`. Many hosts redirect `/index.html` to `/` (Cloudflare Pages, Netlify pretty URLs, Vercel `cleanUrls`). A cached response that went through a redirect keeps a `redirected` flag, and browsers refuse it for a navigation. Safari shows "Response served by service worker has redirections". As a backstop, any precached response that was still redirected is stored as a fresh copy without the flag.
  - Lookups use `ignoreVary`, since hosts may send `Vary: Origin` and `crossorigin` script and style requests carry an Origin header that the precache requests lacked.
  - Caches are named `examlet:<scope>:<version>`, and old versions are deleted when a new worker activates.
- **Updates**: a new worker installs in the background and waits whenever an app window is open. `watchForUpdates` notices it, and `UpdateBanner` offers **Reload**. Accepting sends `SKIP_WAITING`, and the page reloads once the new worker takes control. A new version never replaces the running one mid-session. If no window is open when it finishes installing, there is nothing to disrupt, so it activates right away. Installed apps can stay open for days, so the app also checks for updates whenever it becomes visible again.
- **Dev mode**: the service worker is only registered in production builds (`useServiceWorkerUpdate`), so it never caches Vite's dev server. Use `npm run build && npm run preview` to test offline behavior.
- **CSP**: the worker and manifest are same-origin, so `default-src 'self'` and `script-src 'self'` already cover them.

### Platform notes

| Platform | Install | Notes |
| --- | --- | --- |
| Android | Chrome, Edge, and Samsung Internet show an install prompt | |
| Windows, macOS, Linux | Chrome and Edge install it as an app; Safari on macOS uses *File → Add to Dock* | Firefox desktop has limited install support, but offline still works in a tab |
| iOS, iPadOS | *Share → Add to Home Screen* (no automatic prompt) | The installed app's storage is separate from Safari's. Safari can clear data for sites that haven't been visited in a while; installed apps are exempt |

## Theming

Colors, radii, and motion are CSS custom properties in `src/styles/theme.css`: an orange primary (`--primary: #f2711c`) on warm dark neutrals. Components only reference tokens, so restyling the app only requires editing that file. Animations respect `prefers-reduced-motion`.

## Security

### Runtime

- The production build injects a strict Content-Security-Policy meta tag (see `vite.config.ts`): `default-src 'self'`, no inline scripts, no outside connections, and `object-src`/`base-uri`/`form-action` set to `'none'`. Fonts are never inlined as `data:` URIs, so `font-src 'self'` holds.
- User text is never injected as HTML (see LaTeX above).

### Supply chain

The dependency set is deliberately small. Routing, IndexedDB access, math tokenizing, and the service worker are written in-house instead of being pulled in as packages.

| Runtime | Dev only |
| --- | --- |
| `react`, `react-dom`, `katex` | `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `jsdom`, `@testing-library/*`, `fake-indexeddb`, `@types/react*`, `@types/node` |

Mitigations:

1. **`.npmrc`**
   - `ignore-scripts=true`: dependency `preinstall`/`postinstall` hooks never run. These hooks are the usual malware vector (Shai-Hulud, ChainDrop).
   - `save-exact=true`: new dependencies are pinned to exact versions.
   - `package-lock=true`: every tarball is checked against its lockfile integrity hash.
   - Official registry over TLS only, `engine-strict`, and `audit` enabled.
2. **Vetting before install.** Every package and version was checked on socket.dev (supply-chain score, malware alerts) and against OSV.dev's advisory database, including `MAL-*` malware entries. The full lockfile was batch-checked against OSV after install.
3. **Release cooldown.** Versions were installed with `npm install --before=<date one week earlier>`, so nothing published in the last 7 days could be selected. Most malicious releases are caught and pulled within days.
4. **Verification.** `npm run deps:audit` runs `npm audit` and `npm audit signatures`, which verify registry signatures and provenance attestations.

When adding or updating a dependency:

```bash
# 1. Vet it: socket.dev/npm/package/<name> and https://osv.dev
# 2. Install with a cooldown (adjust the date to ~7 days ago)
npm install --before=YYYY-MM-DD <name>@<exact-version>
# 3. Verify
npm run deps:audit
```

Use `npm ci` (not `npm install`) in CI and fresh clones so the lockfile is followed exactly.

## Testing

Tests run on Vitest with jsdom. `src/test/setup.ts` loads `@testing-library/jest-dom` matchers and `fake-indexeddb/auto`.

- **Unit tests** (`src/lib/*.test.ts`) cover shuffle, the session reducer, the LaTeX tokenizer, file import/export, editor draft logic, routes, the IndexedDB repository and schema-upgrade handoff, and service worker update detection. `src/hooks/useAutosave.test.ts` covers saving when the page is hidden.
- **Build tests** (`pwa/*.test.ts`, which run in the Node environment) cover the precache list and service worker template rendering.
- **Component tests** (`src/components`, `src/pages`) cover KaTeX rendering and HTML escaping, the full study flow including keyboard use, scoring, and retrying missed cards, autosave in the editor, file import on the home page, and the update banner.

`npm run typecheck` runs two configs: `tsconfig.json` for the browser code in `src/`, and `tsconfig.node.json` for the build-time code in `pwa/` and `vite.config.ts`, which gets Node types. Node globals never leak into app code.

```bash
npm test           # run once
npm run test:watch # watch mode
npm run typecheck
npm run build
```
