// Fetch list of indices and stocks in each index from Yahoo Finance API
// This is a utility script, not for direct import in app

const PROXY_URL = 'https://corsproxy.io/?';

// 1. Get all indices (Yahoo Finance: https://query1.finance.yahoo.com/v1/finance/lookup?lang=en&region=IN&query=&type=INDEX)
export async function fetchYahooIndices() {
    const url = `${PROXY_URL}${encodeURIComponent('https://query1.finance.yahoo.com/v1/finance/lookup?lang=en&region=IN&query=&type=INDEX')}`;
    const res = await fetch(url);
    const data = await res.json();
    // Returns array of {symbol, shortname, exchDisp, typeDisp}
    return data?.finance?.result || [];
}

// 2. Get stocks in an index (Yahoo Finance: https://query1.finance.yahoo.com/v7/finance/quote?symbols=NIFTY_50.NS)
export async function fetchStocksInIndex(indexSymbol) {
    // Yahoo does not provide a direct endpoint for index constituents, but you can try:
    // https://query1.finance.yahoo.com/v7/finance/quote?symbols=NIFTY_50.NS
    // Or use scraping/3rd party APIs for full constituents
    const url = `${PROXY_URL}${encodeURIComponent(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${indexSymbol}`)}`;
    const res = await fetch(url);
    const data = await res.json();
    // This only returns the index summary, not constituents
    return data?.quoteResponse?.result?.[0] || null;
}

// 3. (Alternative) Use Yahoo's public CSV for index constituents (if available)
// For NSE, Yahoo does not provide a public endpoint for all index members.
// You may need to use nseindia.com or 3rd party APIs for full lists.

// Usage example (in Node or browser):
// const indices = await fetchYahooIndices();
// const nifty50 = await fetchStocksInIndex('^NSEI');
