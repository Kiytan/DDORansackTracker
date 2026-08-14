# DDO Ransack Tracker

Track chest ransack windows and raid lockouts across every character you play in
_Dungeons & Dragons Online_.

A sibling of [DDO Quest Tracker](https://qt.ddotools.xyz) — same stack, same dark/gold
theme, same "everything stays on your device" approach. No account, no server.

## The rules it models

**Chest ransack.** The first time you loot a quest's chests, a **168-hour** (7 day)
window opens. You may loot **8 times** inside that window before chests stop dropping
named/blue items. Looting again does **not** extend the window — only that first loot
sets the clock. When the 168 hours elapse the counter resets to zero.

**Raid lockouts.** Per character, **2 days 18 hours** (66 hours) from the completion.
Raids have no chest-ransack counter — just the lockout.

## How it works

Add your characters, then search for a quest and add it to your list. Each quest in
the list shows a row per character, with its own loot counter and countdown — so one
glance tells you who still has loots left in Delera's Tomb this week.

- **Type-ahead quest search.** Start typing and matching quests appear; add one with a
  click or Enter.
- **A section per character under every quest.** Individual loot pips, loots remaining,
  countdown to reset, and `−` / `+` buttons each. Click a pip to set the times looted
  directly — handy when you're catching up after a few runs.
- **Pick who goes on which quest.** Tick a character to attach it to quests you add from
  then on, and add or remove characters on any individual quest — no need to carry all
  twelve alts through every entry on your list.
- **Heroic / Epic / Legendary at a glance.** Every quest carries its level and a tier
  badge (Heroic below 20, Epic 20–29, Legendary 30+).
- **Sort and filter.** Sort by time remaining, quest name, level, times looted, patron,
  adventure pack, or the order you added them; filter by raids, patron, pack, level
  range, or a text search over your list.
- **Raid lockouts.** Raids in your list show a lockout per character instead of a chest
  counter.
- **Coming back soon.** The next timers to expire across every character.
- **Corrections.** Started tracking late? Set the times looted with the pips and nudge
  the first-loot time back an hour at a time.
- **Backup and share.** Copy a share link (all data compressed into the URL) or
  download a JSON backup; restore either by merging or replacing.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → ./build
npm run preview    # preview the production build
npm run check      # svelte-check type checking
npm run format     # prettier --write .
npm run lint       # prettier --check .
```

## Tech

Svelte 5 + SvelteKit 2, TypeScript (strict), Vite 7, `@sveltejs/adapter-static`
(prerendered, client-side only), Svelte stores, `localStorage` for persistence and
`lz-string` for share links. Component-scoped CSS, no framework.

The ransack and lockout rules live in one place —
[src/lib/types.ts](src/lib/types.ts) — as constants plus two pure functions;
[src/lib/ransackStore.ts](src/lib/ransackStore.ts) holds all state, persistence and
import/export.

## Data

`static/quests.json` is the quest catalogue shared with DDO Quest Tracker (~856
quests) — the two copies are kept byte-identical, so update one and copy it across.
Raids carry `"raid": true` on the quest entry (each level variant flagged separately);
`isRaid()` in [src/lib/types.ts](src/lib/types.ts) is the only reader. Adding a raid
needs no code change in either project.

## Deployment

`npm run build` writes a fully static site to `build/`, served from the root of a
domain (e.g. `ransack.ddotools.xyz`). Build it on the server and point the web root at
`build/` — same as DDO Quest Tracker and the character generator.

## Licence

GPL-3.0. Unofficial fan tool; _Dungeons & Dragons Online_ is a trademark of its
respective owners.
