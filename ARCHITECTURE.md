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

## Editing and autosave

`SheetEditorPage` keeps an `EditorDraft` in local state. Every edit is passed to `useAutosave`, which debounces for 500 ms and then calls `repository.save(toStored(draft))`.

- `toStored` (in `lib/editor.ts`) skips blank rows, renumbers `position`, and gives empty titles a default name. Blank rows stay visible in the editor but are never stored or studied.
- A new sheet starts at `#/sheets/new/edit`. On its first save the URL is replaced with the real id. The page tracks the loaded id, so this URL swap doesn't reload the page.
- Pending saves are flushed when the page unmounts, and `beforeunload` warns before closing a tab with unsaved edits.

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
- `MathText` renders text segments as React text nodes, which are always escaped. Math segments go through `katex.renderToString` with `trust: false`, which disables `\href`, `\includegraphics`, and similar commands, and `throwOnError: false`, which shows bad LaTeX in red instead of crashing. KaTeX output is the only HTML the app injects.

## Import and export (`src/lib/studysheetFile.ts`)

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

## Theming

Colors, radii, and motion are CSS custom properties in `src/styles/theme.css`: an orange primary (`--primary: #f2711c`) on warm dark neutrals. Components only reference tokens, so restyling the app only requires editing that file. Animations respect `prefers-reduced-motion`.

## Security

### Runtime

- The production build injects a strict Content-Security-Policy meta tag (see `vite.config.ts`): `default-src 'self'`, no inline scripts, no outside connections, and `object-src`/`base-uri`/`form-action` set to `'none'`. Fonts are never inlined as `data:` URIs, so `font-src 'self'` holds.
- User text is never injected as HTML (see LaTeX above).

### Supply chain

The dependency set is deliberately small. Routing, IndexedDB access, and math tokenizing are written in-house instead of being pulled in as packages.

| Runtime | Dev only |
| --- | --- |
| `react`, `react-dom`, `katex` | `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `jsdom`, `@testing-library/*`, `fake-indexeddb`, `@types/react*` |

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

- **Unit tests** (`src/lib/*.test.ts`) cover shuffle, the session reducer, the LaTeX tokenizer, file import/export, editor draft logic, routes, and the IndexedDB repository.
- **Component tests** (`src/components`, `src/pages`) cover KaTeX rendering and HTML escaping, the full study flow including keyboard use, scoring, and retrying missed cards, autosave in the editor, and file import on the home page.

```bash
npm test           # run once
npm run test:watch # watch mode
npm run typecheck
npm run build
```
