// This script fetches Nifty indices and their constituents from NSE India and outputs them in indexData.js format.
// Run with: node fetch_nse_indices.js


import fetch from 'node-fetch';
import fs from 'fs';

const INDICES = [
  'NIFTY 50',
  'NIFTY BANK',
  'NIFTY IT',
  'NIFTY PHARMA',
  'NIFTY AUTO',
  'NIFTY FMCG',
  'NIFTY METAL',
  'NIFTY ENERGY',
  'NIFTY FIN SERVICE',
  'NIFTY REALTY',
  'NIFTY MEDIA',
  'NIFTY PSU BANK',
  'NIFTY CONSUMER DURABLES',
  'NIFTY HEALTHCARE INDEX',
  'NIFTY OIL & GAS',
  'NIFTY INFRASTRUCTURE',
  'NIFTY MIDCAP 50',
  'NIFTY MIDCAP 100',
  'NIFTY SMALLCAP 100',
  'NIFTY MICROCAP 250',
  'NIFTY 500',
];

const API_URL = 'https://www.nseindia.com/api/equity-stockIndices?index=';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Accept': 'application/json',
  'Referer': 'https://www.nseindia.com/'
};

async function fetchConstituents(index) {
  const url = API_URL + encodeURIComponent(index);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ${index}: ${res.status}`);
  const data = await res.json();
  return data.data.map(stock => stock.symbol + '.NS');
}

(async () => {
  const result = {};
  for (const index of INDICES) {
    try {
      const key = index.replace(/\s|&/g, '_').toUpperCase();
      const stocks = await fetchConstituents(index);
      result[key] = stocks;
      console.log(`Fetched ${index}: ${stocks.length} stocks`);
    } catch (e) {
      console.error(`Error fetching ${index}:`, e.message);
    }
  }
  // Output as JS file
  const output = 'export const INDICES = ' + JSON.stringify(result, null, 4) + ';\n';
  fs.writeFileSync('indexData.js', output);
  console.log('Saved to indexData.js');
})();
