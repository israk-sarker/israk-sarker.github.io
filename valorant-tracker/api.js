const API = {
  KEY: "HDEV-fa745e56-7c8e-42d0-b114-812ec9cb6d01",
  BASE: "https://api.henrikdev.xyz/valorant",

  cache: {
    agents: null,
    maps: null,
    weapons: null,
    ranks: null
  },

  async fetchWithKey(url) {
    const res = await fetch(url, {
      headers: { "Authorization": this.KEY }
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${res.status}`);
    }
    return res.json();
  },

  async getAccount(name, tag) {
    return this.fetchWithKey(`${this.BASE}/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  },

  async getMMR(region, name, tag) {
    return this.fetchWithKey(`${this.BASE}/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  },

  async getMatches(region, name, tag, size = 10) {
    return this.fetchWithKey(`${this.BASE}/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=${size}`);
  },

  async getMMRHistory(region, name, tag) {
    return this.fetchWithKey(`${this.BASE}/v1/mmr-history/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  },

  async getAgents() {
    if (this.cache.agents) return this.cache.agents;
    const res = await fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true");
    const json = await res.json();
    this.cache.agents = json.data;
    return json.data;
  },

  async getAgentIcon(agentName) {
    const agents = await this.getAgents();
    const agent = agents.find(a => a.displayName.toLowerCase() === agentName.toLowerCase());
    return agent ? agent.displayIcon : "";
  },

  async getMaps() {
    if (this.cache.maps) return this.cache.maps;
    const res = await fetch("https://valorant-api.com/v1/maps");
    const json = await res.json();
    this.cache.maps = json.data;
    return json.data;
  },

  async getMapImage(mapName) {
    const maps = await this.getMaps();
    const map = maps.find(m => m.displayName.toLowerCase() === mapName.toLowerCase());
    return map ? map.listViewIcon : "";
  },

  async getWeapons() {
    if (this.cache.weapons) return this.cache.weapons;
    const res = await fetch("https://valorant-api.com/v1/weapons");
    const json = await res.json();
    this.cache.weapons = json.data;
    return json.data;
  },

  async getRankTiers() {
    if (this.cache.ranks) return this.cache.ranks;
    const res = await fetch("https://valorant-api.com/v1/competitivetiers");
    const json = await res.json();
    const currentTiers = json.data[json.data.length - 1].tiers;
    this.cache.ranks = currentTiers;
    return currentTiers;
  },

  async getRankImage(tierNumber) {
    if (tierNumber === null || tierNumber === undefined || tierNumber === 0) {
      return "https://media.valorant-api.com/competitivetiers/564d8e28-c226-3180-6285-e48a390db8b1/0/largeicon.png";
    }
    const tiers = await this.getRankTiers();
    const tier = tiers.find(t => t.tier === tierNumber);
    return tier ? tier.largeIcon : "";
  }
};
