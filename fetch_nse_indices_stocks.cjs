// Node.js script to fetch all NSE indices and their constituent stocks from NSE India
// Saves as nse_indices_stocks.csv in the current folder
// Requires: node-fetch, csv-writer

const fetch = require('node-fetch');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const NSE_BASE = 'https://www.nseindia.com';
const INDICES_URL = 'https://www.nseindia.com/api/allIndices';
const INDEX_CONSTITUENTS_URL = 'https://www.nseindia.com/api/index-constituents?index=';

async function fetchIndices() {
    const res = await fetch(INDICES_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    return data.data.map(idx => idx.indexSymbol);
}

async function fetchConstituents(indexSymbol) {
    const url = INDEX_CONSTITUENTS_URL + encodeURIComponent(indexSymbol);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    return data.data.map(stock => ({
        index: indexSymbol,
        symbol: stock.symbol,
        name: stock.companyName
    }));
}

(async () => {
    const indices = await fetchIndices();
    let allRows = [];
    for (const idx of indices) {
        try {
            const stocks = await fetchConstituents(idx);
            allRows = allRows.concat(stocks);
            console.log(`Fetched ${stocks.length} stocks for index ${idx}`);
        } catch (e) {
            console.warn(`Failed to fetch for index ${idx}:`, e.message);
        }
    }
    const csvWriter = createCsvWriter({
        path: './nse_indices_stocks.csv',
        header: [
            { id: 'index', title: 'Index' },
            { id: 'symbol', title: 'Symbol' },
            { id: 'name', title: 'Name' }
        ]
    });
    await csvWriter.writeRecords(allRows);
    console.log('Saved nse_indices_stocks.csv');
})();
