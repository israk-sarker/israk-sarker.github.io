# Valorant Tracker — Full Project Context

> This file documents every request, response, decision, and research done during the refactor conversation. Use it to resume work or onboard anyone to the project.

---

## 1. User's Original Request

**Goal:** Completely scrap the existing React/Vite Valorant Tracker project and rebuild it as a simple vanilla HTML + CSS + JS project (no frameworks, no build tools). Desktop-only, horizontal layout.

### Requested Features (5 Tabs):

#### a) Overview Tab
- General player info: ACS, HS%, K/D, Win Rate, Matches Played, Current Rank
- Win/Loss rate, Kills, Deaths, Assists, First Bloods, Aces
- Best matches and best agents table

#### b) Performance Tab
- Peak rank reached by the player each season/episode/act
- Hours played, total matches played, win rate, ACS, HS%
- Top agent per episode/season

#### c) Match History Tab
- List of last 10–20 most recent matches
- All match statistics per match (K/D/A, ACS, score, map, agent, etc.)

#### d) Weapons Tab
- Weapons sorted by most kills in current act
- HS%, kills, deaths, ACS per weapon (if API supports it)

#### e) Compare Tab
- Compare 2 player profiles side by side
- Generic stats of the current act

### Design Requirements
- Clean, modern, simplistic — not too complicated
- Desktop-only horizontal layout
- Code should be simple, straightforward, as short as possible — no useless code
- Can use Chart.js for graphs
- Can use any CDN library if it makes things easier, as long as project files are only HTML/CSS/JS
- Inspired by dashboard mockups provided (dark theme, card-based stat grids, charts)

---

## 2. APIs & Credentials Provided

### HenrikDev Unofficial Valorant API (Primary Data Source)
- **Docs:** https://docs.henrikdev.xyz
- **GitHub:** https://github.com/Henrik-3/unofficial-valorant-api
- **Status:** https://status.henrikdev.xyz
- **Key Registration:** https://henrikdev.xyz
- **Base URL:** `https://api.henrikdev.xyz/valorant`
- **API Key:** `HDEV-259157f3-c8d4-4374-8b39-6a7b4ba802c8`

#### Endpoints Used:
| Endpoint | Purpose |
|---|---|
| `GET /v1/account/{name}/{tag}` | Account info (name, tag, level, card) |
| `GET /v2/mmr/{region}/{name}/{tag}` | Current rank, peak rank, by_season data |
| `GET /v3/matches/{region}/{name}/{tag}?size=10` | Match history with player stats + kill events |
| `GET /v1/mmr-history/{region}/{name}/{tag}` | RR progression per match |

### valorant-api.com (Asset Images — No Key Needed)
- **Docs:** https://valorant-api.com
- **Dashboard:** https://dash.valorant-api.com
- **GitHub:** https://github.com/valorant-api/valorant-api.com

#### Endpoints Used:
| Endpoint | Purpose |
|---|---|
| `GET https://valorant-api.com/v1/competitivetiers` | Rank tier icons |
| `GET https://valorant-api.com/v1/agents?isPlayableCharacter=true` | Agent icons/data |
| `GET https://valorant-api.com/v1/maps` | Map splash images |
| `GET https://valorant-api.com/v1/weapons` | Weapon icons/data |

### Riot Games Official (Reference only, not used)
- **Dev Portal:** https://developer.riotgames.com
- **Valorant API Docs:** https://developer.riotgames.com/apis#val-match-v1

### Chart.js
- **Docs:** https://www.chartjs.org/docs/latest/

---

## 3. Existing React Project Structure (Before Refactor)

```
valorant-tracker/
├── index.html              (Vite entry point)
├── package.json            (Vite + React deps)
├── package-lock.json
├── tsconfig.json
├── node_modules/
├── public/
└── src/
    ├── App.jsx             (React Router setup)
    ├── api.js              (All API calls — 166 lines)
    ├── main.jsx            (React entry point)
    ├── main.ts             (TypeScript entry — unused?)
    ├── counter.ts          (TypeScript counter — unused?)
    ├── index.css           (Main stylesheet — 952 lines)
    ├── style.css           (Secondary styles — 5060 bytes)
    └── components/
        ├── SearchPage.jsx  (Search screen)
        ├── Navbar.jsx      (Navigation bar)
        ├── Overview.jsx    (Stats dashboard — 490 lines)
        ├── Performance.jsx (Rank history per season — 188 lines)
        ├── MatchHistory.jsx(Recent matches list — 173 lines)
        ├── Weapons.jsx     (Weapon stats — 154 lines)
        └── Compare.jsx     (Compare 2 players — 277 lines)
```

### Key Patterns from React Code:
- Used React Router for navigation (`/player/:region/:name/:tag/overview`, etc.)
- Used `useParams()` to extract player info from URL
- Used `useState` + `useEffect` for data fetching
- Used `Promise.all` for parallel API calls
- Cached asset data (agents, maps, weapons, rank tiers) after first fetch
- Season sorting: parsed `e{episode}a{act}` format, sorted newest first
- Stats calculation: looped through matches to find "our" player, aggregated K/D/A/HS/score/damage
- Weapon data extracted from `match.kills[]` events (only killer's kills counted)

---

## 4. Research Performed

### API Documentation Reviewed:
1. **HenrikDev main docs** (https://docs.henrikdev.xyz) — Confirmed available endpoints
2. **Account endpoint** (https://docs.henrikdev.xyz/valorant/api-reference/accounts) — v1 returns: `{ puuid, region, account_level, name, tag, card: { small, large, wide, id } }`
3. **MMR endpoint** (https://docs.henrikdev.xyz/valorant/api-reference/mmr) — v2 returns: `{ current_data: { currenttier, currenttier_patched, ranking_in_tier, mmr_change_to_last_game, elo }, highest_rank: { tier, patched_tier, season }, by_season: { [key]: { wins, number_of_games, final_rank, final_rank_patched } } }`
4. **Match endpoint** (https://docs.henrikdev.xyz/valorant/api-reference/match) — v3 returns array of matches with full player stats, kill events, team data
5. **MMR History** (https://docs.henrikdev.xyz/valorant/api-reference/mmr-history) — Returns RR changes per match
6. **valorant-api.com** (https://valorant-api.com) — Confirmed assets for agents, maps, weapons, competitive tiers
7. **General API info** (https://docs.henrikdev.xyz/valorant/general) — Regions: ap, br, eu, kr, latam, na

### API Response Structures (Key Data):

#### v1/account response:
```json
{
  "status": 200,
  "data": {
    "puuid": "...", "region": "eu", "account_level": 123,
    "name": "Player", "tag": "TAG",
    "card": { "small": "url", "large": "url", "wide": "url" }
  }
}
```

#### v2/mmr response:
```json
{
  "status": 200,
  "data": {
    "name": "Player", "tag": "TAG",
    "current_data": {
      "currenttier": 12, "currenttier_patched": "Gold 1",
      "ranking_in_tier": 20, "mmr_change_to_last_game": -16, "elo": 920,
      "images": { "small": "url", "large": "url" }
    },
    "highest_rank": { "tier": 19, "patched_tier": "Diamond 2", "season": "e5a3" },
    "by_season": {
      "e9a3": { "error": false, "wins": 12, "number_of_games": 24, "final_rank": 12, "final_rank_patched": "Gold 1" },
      ...
    }
  }
}
```

#### v3/matches response (per match):
```json
{
  "metadata": { "matchid": "...", "map": "Ascent", "mode": "Competitive", "rounds_played": 24, "game_start_patched": "..." },
  "players": {
    "all_players": [{
      "name": "Player", "tag": "TAG", "team": "Blue", "character": "Jett",
      "stats": { "kills": 20, "deaths": 15, "assists": 5, "score": 5000, "headshots": 8, "bodyshots": 20, "legshots": 2 },
      "damage_made": 3500,
      "assets": { "agent": { "small": "url" } }
    }]
  },
  "teams": { "blue": { "has_won": true, "rounds_won": 13, "rounds_lost": 11 } },
  "kills": [{ "killer_display_name": "Player#TAG", "damage_weapon_name": "Vandal", "damage_weapon_assets": { "display_icon": "url" } }]
}
```

---

## 5. API Limitations Discovered

| Limitation | Impact |
|---|---|
| **Free tier: max 10 matches per request** | Match History shows 10 (not 20), all stats based on 10 matches max |
| **No per-weapon HS%/deaths/ACS** | Weapons tab can only show kills count + kill% from kill events |
| **No first bloods/aces in match data** | Cannot show first bloods or aces in Overview (not in v3 match response) |
| **No hours played** | Performance tab cannot show hours played per season |
| **No top agent per season** | API only gives rank/wins/games per season, not agent breakdown per season |
| **API key in client-side JS** | Fine for school/local use, not safe for public deployment |

---

## 6. Implementation Plan (Approved)

### New Project Structure:
```
valorant-tracker/
├── index.html     (~80 lines)   — Structure + CDN links
├── style.css      (~750 lines)  — Complete dark dashboard theme
├── api.js         (~120 lines)  — All API fetch functions
├── app.js         (~550 lines)  — All UI logic, tab switching, rendering
└── context.md                   — This file
```

### Architecture Decisions:
1. **No build tools** — Just open index.html in a browser
2. **Hash-based tab routing** — `#overview`, `#performance`, `#matches`, `#weapons`, `#compare`
3. **Global `API` object** — All fetch functions on one object, cached data
4. **Global `APP` state** — Stores account, mmr, matches, region, name, tag
5. **innerHTML rendering** — Each tab function builds HTML string and sets container innerHTML
6. **Chart.js via CDN** — For rank progression chart in Performance tab
7. **CDN libraries allowed** — Can add more if needed, as long as project files remain HTML/CSS/JS only
8. **Desktop-only** — No responsive/mobile layout

### Color Palette (CSS Variables):
- `--bg-darkest: #0a0c10` (page background)
- `--bg-dark: #0e1015` (navbar)
- `--bg-card: #171923` (card backgrounds)
- `--red: #ff4655` (Valorant accent, losses)
- `--green: #17b35a` (wins, positive stats)
- `--blue: #4a90d9` (links, secondary accent)
- `--gold: #f5a623` (highlights)
- `--text-primary: #e8eaf0`
- `--text-secondary: #8b8fa3`
- `--text-muted: #5a5e72`

### Tab Details:

#### Overview:
- Player header (avatar, name#tag, level)
- Current rank card + Peak rank card (with rank icons from valorant-api.com)
- Lifetime stats from by_season data (total matches, total wins, win%)
- Recent match stats grid (K/D, HS%, Win%, Damage/Round, ACS, Kills/Round, Total Kills, Matches)
- Top agents table (from match data aggregation)

#### Performance:
- Peak rank highlight card
- Chart.js line chart showing win rate per season
- Season table: season name, rank icon + name, wins, games, win%
- Sorted newest first (episode+act parsing)

#### Match History:
- 10 most recent matches
- Each row: win/loss bar, agent icon, map + mode + date, score, K/D/A, ACS, K/D ratio, HS%

#### Weapons:
- Summary line with total kills
- Table: weapon icon, name, kills, kill%, usage bar
- Data from kill events in match data

#### Compare:
- Two search bars (region + name#tag)
- Player 1 auto-fills with current player
- Side-by-side stat comparison with better values highlighted green
- Last 5 mini match rows per player

---

## 7. Open Decisions

| Question | Resolution |
|---|---|
| Default region | EU (kept from original) |
| CDN libraries | Can use any CDN lib if it helps — just keep project files as HTML/CSS/JS |
| API key security | Acceptable for school/local use |
| Match count | 10 (free tier limit) |
| First bloods / Aces | Not available from API — will not implement |
| Hours played | Not available from API — will not implement |
| Top agent per season | Not available from API — will not implement |

---

## 8. Files Examined During Research

### React Components Read:
- `src/App.jsx` — Router setup (56 lines)
- `src/api.js` — All API calls (166 lines)
- `src/components/SearchPage.jsx` — Search UI (referenced)
- `src/components/Navbar.jsx` — Navigation (referenced)
- `src/components/Overview.jsx` — Main stats (490 lines)
- `src/components/Performance.jsx` — Season history (188 lines)
- `src/components/MatchHistory.jsx` — Match list (173 lines)
- `src/components/Weapons.jsx` — Weapon stats (154 lines)
- `src/components/Compare.jsx` — Player comparison (277 lines)
- `src/index.css` — Full stylesheet (952 lines)

### External Docs Read:
- https://docs.henrikdev.xyz (main page)
- https://docs.henrikdev.xyz/valorant/api-reference (endpoint list)
- https://docs.henrikdev.xyz/valorant/api-reference/accounts (account endpoint details + response schema)
- https://docs.henrikdev.xyz/valorant/api-reference/mmr (MMR endpoint details + v2/v3 response schemas)
- https://docs.henrikdev.xyz/valorant/api-reference/match (match endpoint details)
- https://docs.henrikdev.xyz/valorant/general (regions, rate limits)
- https://valorant-api.com (asset API overview)
- https://dash.valorant-api.com (asset API dashboard)

---

## 9. Next Steps

1. Delete all React/Vite files
2. Create `index.html`, `style.css`, `api.js`, `app.js`
3. Test in browser with a real Riot ID
4. Verify all 5 tabs work correctly
5. Fine-tune styling and layout
