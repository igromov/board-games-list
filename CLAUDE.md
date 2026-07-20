# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, single-page site (Russian-language UI) that displays a personal board game collection ("Наши настолки") with search and filtering. No build step, no framework, no package manager — plain HTML/CSS/JS served as static files.

- `index.html` — page shell and filter controls markup
- `app.js` — all client logic: fetches `games_database.json`, renders game cards, and drives the filter UI
- `style.css` — all styling, using CSS custom properties defined in `:root`
- `games_database.json` — the single source of truth for game data (see schema below)
- `images/` — local game cover images referenced by `photoUrl` in the JSON
- `photo_download.py` — one-off Python script to download remote `photoUrl` images into `images/` and rewrite the JSON to point at local paths

## Running locally

Because `app.js` fetches `games_database.json` via `fetch()`, opening `index.html` directly as a `file://` URL will fail in most browsers (CORS restrictions on local fetch). Serve the directory over HTTP instead, e.g.:

```
python -m http.server 8000
```

then open `http://localhost:8000/`.

There is no build, lint, or test tooling in this repo.

## Data model (`games_database.json`)

Top-level shape: `{ "games": [ ... ] }`. Each game object:

- `name`, `link` (external store/wiki page), `photoUrl` (local path under `images/` or a remote URL)
- `quantity` — number of physical copies owned; only rendered as a chip when > 1
- `playersMin` / `playersMax` — box-stated player range
- `playersMinRecommend` / `playersMaxRecommend` — "recommended" range used preferentially over the box range when present (see filter logic below)
- `timeToLearn` — minutes, used by the learning-time filter
- `playtimeMin` / `playtimeMax` — minutes; `playtimeMax` is what the play-time filter buckets against
- `descriptionShort`, `tags` (array of free-text Russian tags, rendered as clickable chips)

`app.js` derives the full set of available tags from the data at load time (`allTags`) rather than from a fixed list.

## Filtering architecture (`app.js`)

All filter state is module-level (`activeTagFilters`, `activePlayersFilter`, `activeLearningFilter`, `activeTimeFilter`) plus the search box value. `filterGames()` re-derives the visible list from `gamesData` on every change and calls `renderGames()` — there is no diffing, the grid is fully re-rendered (and re-shuffled) each time.

Bucketed filters (players/time/learning) are single-select radio-style buttons (`setupSingleFilter`), toggled off by clicking the active one again. Tag filters are multi-select AND (`toggleTagFilter`) — a game must have every active tag to match.

Player-count filtering prefers the recommended range over the box range when `playersMinRecommend > 0`:
```js
const min = game.playersMinRecommend > 0 ? game.playersMinRecommend : game.playersMin;
const max = game.playersMaxRecommend > 0 ? game.playersMaxRecommend : game.playersMax;
```
Time and learning filters bucket against fixed ranges defined in `PLAYTIME_RANGES` / `LEARNING_TIME_RANGES` at the top of `app.js` — extend these objects (and the corresponding buttons in `index.html`) together when adding a new bucket.

## Editing game data

Add/edit entries directly in `games_database.json`, following the schema above. If a game's `photoUrl` is a remote URL, run `python photo_download.py` to download it locally and rewrite the JSON entry to the local `images/...` path (it skips entries that are already local or already downloaded).
