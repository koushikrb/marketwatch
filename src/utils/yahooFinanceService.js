import { cacheStockData, getCachedStockData } from './db';
import Fuse from 'fuse.js';
import nseStocks from './nseStocks.json';

const PROXY_URL = 'https://corsproxy.io/?';

export const fetchStockData = async (symbol, range = '1y', interval = '1d', forceRefresh = false) => {
    // 1. Check Cache First (skip if forceRefresh is true)
    if (!forceRefresh) {
        try {
            const cachedData = await getCachedStockData(symbol, range, interval);
            if (cachedData && cachedData.length > 0) {
                console.log(`[API] Using cached data for ${symbol}`);
                return { data: cachedData, metadata: {} }; // Standardized format
            }
        } catch (err) {
            console.warn(`[API] Cache read failed for ${symbol}:`, err);
        }
    } else {
        console.log(`[API] Force refresh requested for ${symbol}, bypassing cache`);
    }

    // 2. Fetch from Network
    console.log(`[API] Fetching ${symbol} from network...`);
    try {
        const queryUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
        const timestampParams = forceRefresh ? `&t=${Date.now()}` : '';
        const params = `?range=${range}&interval=${interval}${timestampParams}`;
        const url = `${PROXY_URL}${encodeURIComponent(queryUrl + params)}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error('Invalid API response format');
        }

        const result = data.chart.result[0];
        const quotes = result.indicators.quote[0];
        const timestamps = result.timestamp;

        if (!timestamps || !quotes.close) {
            throw new Error('No price data found');
        }

        // 3. Process and Sanitize Data
        let formattedData = timestamps.map((time, index) => {
            if (!time || quotes.close[index] === null || quotes.open[index] === null) return null;

            return {
                time: time,
                open: Number(quotes.open[index]),
                high: Number(quotes.high[index]),
                low: Number(quotes.low[index]),
                close: Number(quotes.close[index]),
                volume: Number(quotes.volume[index] || 0)
            };
        }).filter(item => item !== null);

        // Strict Sorting by Time
        formattedData.sort((a, b) => a.time - b.time);

        // Deduplicate
        const uniqueData = [];
        const seenTimes = new Set();
        for (const item of formattedData) {
            if (!seenTimes.has(item.time)) {
                seenTimes.add(item.time);
                uniqueData.push(item);
            }
        }

        console.log(`[API] ${symbol} fetched: ${uniqueData.length} records`);

        // 4. Cache the data
        try {
            await cacheStockData(symbol, range, interval, uniqueData);
        } catch (err) {
            console.warn(`[API] Cache write failed for ${symbol}:`, err);
        }

        return {
            data: uniqueData,
            metadata: {
                currency: result.meta.currency,
                exchangeName: result.meta.exchangeName,
                timezone: result.meta.timezone,
                exchangeTimezoneName: result.meta.exchangeTimezoneName,
                regularMarketPrice: result.meta.regularMarketPrice,
                chartPreviousClose: result.meta.chartPreviousClose
            }
        };

    } catch (error) {
        console.error(`[API] Error fetching ${symbol}:`, error);
        return { data: [], metadata: {} };
    }
};

/**
 * Robust Data Repair (inspired by yfinance-rs)
 * Detects and fix price outliers using a rolling median window
 */
export const repairData = (data) => {
    if (!data || data.length < 5) return data;

    // 1. Rounding and Gap Handling
    let repaired = data.map(point => ({
        ...point,
        open: Number(point.open.toFixed(2)),
        high: Number(point.high.toFixed(2)),
        low: Number(point.low.toFixed(2)),
        close: Number(point.close.toFixed(2)),
    }));

    // 2. Outlier Detection
    repaired = repaired.map((point, i, arr) => {
        if (i < 2 || i > arr.length - 3) return point;

        // Take a window of 5 points
        const window = arr.slice(i - 2, i + 3).map(p => p.close);
        const sortedWindow = [...window].sort((a, b) => a - b);
        const median = sortedWindow[2];

        // If the current point deviates more than 10% from the median, it's a spike
        const deviation = Math.abs(point.close - median) / median;
        if (deviation > 0.10) {
            console.warn(`[DataRepair] spike detected for ${point.close} -> ${median}`);
            return { ...point, close: median, high: Math.max(point.high, median), low: Math.min(point.low, median) };
        }

        return point;
    });

    return repaired;
};

export const fetchStockStats = async (symbols) => {
    try {
        const queryUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
        const url = `${PROXY_URL}${encodeURIComponent(queryUrl)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.quoteResponse && data.quoteResponse.result) {
            return data.quoteResponse.result;
        }
        return [];
    } catch (err) {
        console.error(`[API] Stats fetch error for ${symbols}`, err);
        return [];
    }
};

/**
 * Fetch Analyst Recommendations (inspired by yfinance-rs)
 */
export const fetchRecommendations = async (symbol) => {
    try {
        const queryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=recommendationTrend`;
        const url = `${PROXY_URL}${encodeURIComponent(queryUrl)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.quoteSummary?.result?.[0]?.recommendationTrend?.trend) {
            return data.quoteSummary.result[0].recommendationTrend.trend;
        }
        return [];
    } catch (error) {
        console.error(`[API] Recommendations failed for ${symbol}:`, error);
        return [];
    }
};

export const searchStocks = async (query) => {
    try {
        const url = `${PROXY_URL}${encodeURIComponent(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}`)}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log(`[Search] Query: "${query}", Results:`, data.quotes?.length || 0);

        let nseResults = [];
        if (data.quotes && data.quotes.length > 0) {
            nseResults = data.quotes
                .filter(q =>
                    (q.symbol && q.symbol.endsWith('.NS')) ||
                    (q.exchange && q.exchange.toUpperCase() === 'NSE')
                )
                .map(q => ({
                    symbol: q.symbol,
                    name: q.shortname || q.longname,
                    exchange: q.exchange
                }));
        }
        // If no NSE results or no close match, use fuzzy search on local NSE list
        if (nseResults.length === 0 || !nseResults.some(s => s.symbol.toLowerCase().includes(query.replace(/\s/g, '').toLowerCase()) || (s.name && s.name.toLowerCase().includes(query.toLowerCase())))) {
            const fuse = new Fuse(nseStocks, { keys: ['symbol', 'name'], threshold: 0.4 });
            const fuzzy = fuse.search(query);
            if (fuzzy.length > 0) {
                // Return top 5 fuzzy matches as suggestions
                return fuzzy.slice(0, 5).map(f => ({
                    symbol: f.item.symbol,
                    name: f.item.name,
                    exchange: 'NSE'
                }));
            }
        }
        return nseResults;
    } catch (e) {
        console.error("Search error", e);
        return [];
    }
}
