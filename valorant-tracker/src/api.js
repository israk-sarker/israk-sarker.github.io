// ============================================
// api.js — All API calls in one place
// ============================================
// We use two APIs:
// 1) HenrikDev API (api.henrikdev.xyz) — player stats, rank, matches
// 2) valorant-api.com — images for agents, ranks, weapons, maps

// Our API key for HenrikDev (only for local use, never publish this)
const API_KEY = "HDEV-259157f3-c8d4-4374-8b39-6a7b4ba802c8";
const BASE_URL = "https://api.henrikdev.xyz/valorant";

// ---------- helper function ----------
// This function makes a GET request to HenrikDev API
// We pass the API key in the "Authorization" header
async function apiFetch(endpoint) {
  const response = await fetch(BASE_URL + endpoint, {
    headers: { Authorization: API_KEY },
  });
  const json = await response.json();
  return json;
}

// ============================================
// 1) Get account info (name, tag, level, card)
// ============================================
// Example: getAccount("Mr DMK 101", "mugay")
// Returns: { puuid, region, account_level, name, tag, card }
export async function getAccount(name, tag) {
  const data = await apiFetch(
    `/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`
  );
  return data;
}

// ============================================
// 2) Get MMR (rank) data
// ============================================
// Returns: current rank, peak rank, rank per season
// We use v2 because it gives us by_season data
export async function getMMR(region, name, tag) {
  const data = await apiFetch(
    `/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`
  );
  return data;
}

// ============================================
// 3) Get match history
// ============================================
// Returns: array of match objects with all player stats
// size = how many matches to fetch (max 10 for free tier)
export async function getMatches(region, name, tag, size = 5) {
  const data = await apiFetch(
    `/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(
      tag
    )}?size=${size}`
  );
  return data;
}

// ============================================
// 4) Get MMR history (RR changes per match)
// ============================================
// Returns: array of { currenttier, ranking_in_tier, mmr_change_to_last_game, map, date }
export async function getMMRHistory(region, name, tag) {
  const data = await apiFetch(
    `/v1/mmr-history/${region}/${encodeURIComponent(
      name
    )}/${encodeURIComponent(tag)}`
  );
  return data;
}

// ============================================
// 5) Get rank tier images from valorant-api.com
// ============================================
// The tier number (0-27) maps to a rank icon
// We fetch ALL competitive tiers once, then pick the right one
let cachedTiers = null;

export async function getRankImage(tierNumber) {
  // If we already fetched the tiers, use the cached version
  if (!cachedTiers) {
    const res = await fetch("https://valorant-api.com/v1/competitivetiers");
    const json = await res.json();
    // The last item in the array has the current tier icons
    const latestSeason = json.data[json.data.length - 1];
    cachedTiers = latestSeason.tiers;
  }

  // Find the tier that matches our number
  const tier = cachedTiers.find((t) => t.tier === tierNumber);
  if (tier) {
    return tier.largeIcon;
  }
  return null;
}

// ============================================
// 6) Get all agents from valorant-api.com
// ============================================
let cachedAgents = null;

export async function getAgents() {
  if (!cachedAgents) {
    const res = await fetch(
      "https://valorant-api.com/v1/agents?isPlayableCharacter=true"
    );
    const json = await res.json();
    cachedAgents = json.data;
  }
  return cachedAgents;
}

// Helper: get a single agent's icon by name
export async function getAgentIcon(agentName) {
  const agents = await getAgents();
  const agent = agents.find(
    (a) => a.displayName.toLowerCase() === agentName.toLowerCase()
  );
  if (agent) {
    return agent.displayIcon;
  }
  return null;
}

// ============================================
// 7) Get all maps from valorant-api.com
// ============================================
let cachedMaps = null;

export async function getMaps() {
  if (!cachedMaps) {
    const res = await fetch("https://valorant-api.com/v1/maps");
    const json = await res.json();
    cachedMaps = json.data;
  }
  return cachedMaps;
}

// Helper: get map splash image by map name
export async function getMapImage(mapName) {
  const maps = await getMaps();
  const map = maps.find(
    (m) => m.displayName.toLowerCase() === mapName.toLowerCase()
  );
  if (map) {
    return map.splash;
  }
  return null;
}

// ============================================
// 8) Get all weapons from valorant-api.com
// ============================================
let cachedWeapons = null;

export async function getWeapons() {
  if (!cachedWeapons) {
    const res = await fetch("https://valorant-api.com/v1/weapons");
    const json = await res.json();
    cachedWeapons = json.data;
  }
  return cachedWeapons;
}
