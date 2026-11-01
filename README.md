# Examlet

A browser-only flashcard app for exam prep, with LaTeX math support. Cards are grouped into studysheets and stored in IndexedDB. There is no account and no server.

## Features

- **Studysheets**: create named groups of cards (e.g. "Modern Algebra Exam 2"). Edits autosave.
- **Study sessions**: cards are shuffled. Flip each card, then mark it *Got it* or *Missed it*. A score screen at the end lets you retry only the cards you missed.
- **Two directions**: show the term first, or show the definition first.
- **LaTeX**: `$x^2$` for inline math and `$$\int_0^1 f$$` for display math, rendered with KaTeX. A live preview appears under any field with math, and the **Σ** button beside each field opens a searchable symbol palette, so you don't need to know LaTeX.
- **Long definitions**: cards grow to fit and scroll internally when needed.
- **Import and export**: `.studysheet.json` files. Try `examples/modern-algebra-exam-2.studysheet.json`.
- **Installable and offline**: Examlet is a Progressive Web App. Install it from Chrome or Edge (Windows, macOS, Linux, Android), with *Add to Dock* in Safari on macOS, or with *Share → Add to Home Screen* on iOS and iPadOS. After the first visit everything works with no network.

Keyboard: Space flips the card. Once it's revealed, `1` = missed and `2` = got it.

## Development

Requires Node ≥ 22.

```bash
npm ci
npm run dev
npm test
npm run build   # static output in dist/
```

Offline support only runs in production builds. To try it, run `npm run build && npm run preview`.

On iOS the installed app has its own storage, separate from Safari's, so use export and import to move sheets between them. Safari can also clear data for sites that haven't been visited in a while; installed apps are exempt.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design and the supply-chain security setup.
