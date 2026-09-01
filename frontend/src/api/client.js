// Frontend/src/api/client.js

const INDIAN_CITIES = [
  { lat: 26.4499, lng: 80.3319 }, // Kanpur, UP
  { lat: 27.1767, lng: 78.0081 }, // Agra, UP
  { lat: 28.9845, lng: 77.7064 }, // Meerut, UP
  { lat: 25.5941, lng: 85.1376 }, // Patna, Bihar
  { lat: 24.7914, lng: 85.0002 }, // Gaya, Bihar
  { lat: 28.4089, lng: 77.3178 }, // Faridabad, Haryana
  { lat: 29.1492, lng: 75.7217 }, // Hisar, Haryana
  { lat: 23.7957, lng: 86.4304 }, // Dhanbad, Jharkhand
  { lat: 23.3441, lng: 85.3096 }, // Ranchi, Jharkhand
  { lat: 26.2183, lng: 78.1828 }, // Gwalior, MP
  { lat: 23.1815, lng: 79.9864 }, // Jabalpur, MP
  { lat: 21.1702, lng: 72.8311 }, // Surat, Gujarat
  { lat: 25.3176, lng: 82.9739 }, // Varanasi, UP
  { lat: 26.7606, lng: 83.3732 }, // Gorakhpur, UP
  { lat: 20.5579, lng: 74.5089 }, // Malegaon, Maharashtra
  { lat: 28.6139, lng: 77.2090 }, // Delhi
  { lat: 19.0760, lng: 72.8777 }, // Mumbai
  { lat: 13.0827, lng: 80.2707 }, // Chennai
  { lat: 22.5726, lng: 88.3639 }, // Kolkata
  { lat: 17.3850, lng: 78.4867 }, // Hyderabad
  { lat: 12.9716, lng: 77.5946 }, // Bengaluru
  { lat: 26.9124, lng: 75.7873 }, // Jaipur
  { lat: 23.0225, lng: 72.5714 }, // Ahmedabad
  { lat: 30.7333, lng: 76.7794 }, // Chandigarh
  { lat: 15.2993, lng: 74.1240 }  // Goa
];

async function loadLocalScores() {
  const res = await fetch('/scores.json');
  if (!res.ok) throw new Error('Failed to load local scores.json');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || data.scores || []);
}

export async function getRankedAccounts({ limit = 100, offset = 0 } = {}) {
  try {
    const results = await loadLocalScores();
    return {
      total: results.length,
      results: results.slice(offset, offset + limit)
    };
  } catch (error) {
    console.error("Local data error:", error);
    return { total: 0, results: [] };
  }
}

export async function getAccountDetail(accountId) {
  const results = await loadLocalScores();
  const match = results.find(item => item.account_id === accountId);
  if (!match) throw new Error(`Account ${accountId} not found`);
  return match;
}

export async function getAccountsForMap(minRisk = 0.65, limit = 100) {
  try {
    const results = await loadLocalScores();
    const filtered = results
      .filter(item => (item.risk_score || 0) >= minRisk)
      .slice(0, limit);

    const accounts = filtered.map((item, index) => {
      // Truly random pick from the cities array based on account string hash
      let hash = 0;
      const accId = item.account_id || `ACC_${index}`;
      for (let i = 0; i < accId.length; i++) {
        hash = accId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const city = INDIAN_CITIES[Math.abs(hash) % INDIAN_CITIES.length];

      // Random scatter offset (~15 km radius)
      const latOffset = (Math.random() - 0.5) * 0.25;
      const lngOffset = (Math.random() - 0.5) * 0.25;

      return {
        account_id: item.account_id,
        risk_score: item.risk_score,
        rank: item.rank,
        estimated_monthly_loss: item.estimated_monthly_loss,
        latitude: Number((city.lat + latOffset).toFixed(6)),
        longitude: Number((city.lng + lngOffset).toFixed(6)),
        top_reasons: item.top_reasons || []
      };
    });

    return {
      total: accounts.length,
      accounts
    };
  } catch (error) {
    console.error("Map generation error:", error);
    return { total: 0, accounts: [] };
  }
}

export const fetchRankedAccounts = getRankedAccounts;
export const fetchAccountDetail = getAccountDetail;