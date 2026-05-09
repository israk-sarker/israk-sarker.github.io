export const APIPerformance = {
  KEY: "HDEV-fa745e56-7c8e-42d0-b114-812ec9cb6d01",
  BASE: "https://api.henrikdev.xyz/valorant",

  cache: {
    ranks: null
  },

  async fetchWithKey(url) {
    const res = await fetch(url, { headers: { "Authorization": this.KEY } });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${res.status}`);
    }
    return res.json();
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
