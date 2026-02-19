import React, { createContext, useState, useContext, useEffect } from 'react';
import { INDICES, SECTORS } from './indexData';
import nseStocksRaw from './nseStocks.json';
// Build a symbol-to-name map for all NSE stocks
const symbolNameMap = {};
nseStocksRaw.forEach(stock => {
    symbolNameMap[stock.symbol] = stock.name;
});
import { fetchStockData, fetchStockStats, repairData, fetchRecommendations } from './yahooFinanceService';
import streamingService from './YahooStreamingService';

const StockContext = createContext();

export const useStock = () => useContext(StockContext);


export const StockProvider = ({ children }) => {
    const [selectedStock, setSelectedStock] = useState({
        symbol: 'RELIANCE.NS',
        price: 2987.50,
        change: 1.25,
        volume: 5432100
    });

    // --- Multiple Watchlists State ---
    const defaultWatchlists = [
        {
            id: 'default',
            label: 'My Watchlist',
            stocks: [
                { symbol: 'RELIANCE.NS', price: 2987.50, change: 1.25, volume: 5432100 },
                { symbol: 'TCS.NS', price: 3890.00, change: -0.45, volume: 2100500 },
                { symbol: 'HDFCBANK.NS', price: 1650.75, change: 0.80, volume: 12500000 },
            ]
        }
    ];
    const [watchlists, setWatchlists] = useState(() => {
        const saved = localStorage.getItem('nse_watchlists');
        return saved ? JSON.parse(saved) : defaultWatchlists;
    });
    const [activeWatchlistId, setActiveWatchlistId] = useState(() => {
        const saved = localStorage.getItem('nse_active_watchlist');
        return saved || 'default';
    });

    // Persist watchlists and active id
    useEffect(() => {
        localStorage.setItem('nse_watchlists', JSON.stringify(watchlists));
    }, [watchlists]);
    useEffect(() => {
        localStorage.setItem('nse_active_watchlist', activeWatchlistId);
    }, [activeWatchlistId]);

    // Helper: get active watchlist object
    const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0];
    const watchlist = activeWatchlist ? activeWatchlist.stocks : [];

    // --- Watchlist CRUD ---
    const createWatchlist = (label = 'New Watchlist') => {
        const id = 'wl_' + Date.now();
        const newWl = { id, label, stocks: [] };
        setWatchlists(prev => [...prev, newWl]);
        setActiveWatchlistId(id);
    };
    const renameWatchlist = (id, newLabel) => {
        setWatchlists(prev => prev.map(w => w.id === id ? { ...w, label: newLabel } : w));
    };
    const deleteWatchlist = (id) => {
        setWatchlists(prev => prev.filter(w => w.id !== id));
        // If deleting active, switch to first
        if (id === activeWatchlistId) {
            setTimeout(() => {
                setActiveWatchlistId(watchlists.length > 1 ? watchlists.find(w => w.id !== id).id : 'default');
            }, 0);
        }
    };
    const switchWatchlist = (id) => {
        setActiveWatchlistId(id);
    };

    // Add/remove stock in active watchlist
    const addToWatchlist = (stock) => {
        setWatchlists(prev => prev.map(w =>
            w.id === activeWatchlistId && !w.stocks.find(s => s.symbol === stock.symbol)
                ? { ...w, stocks: [...w.stocks, stock] }
                : w
        ));
    };
    const removeFromWatchlist = (symbol) => {
        setWatchlists(prev => prev.map(w =>
            w.id === activeWatchlistId
                ? { ...w, stocks: w.stocks.filter(s => s.symbol !== symbol) }
                : w
        ));
    };

    const [viewMode, setViewMode] = useState('grid');
    const [activeFilter, setActiveFilter] = useState('NIFTY_50');
    const [displayedStocks, setDisplayedStocks] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [gridColumns, setGridColumns] = useState(1);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [gridData, setGridData] = useState({});
    const [stockStats, setStockStats] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [timeframe, setTimeframe] = useState('daily');
    const [sortOrder, setSortOrder] = useState('default');
    const [recommendations, setRecommendations] = useState([]);
    const [selectedMetadata, setSelectedMetadata] = useState({});

    // Multi-select filter state
    const [selectedIndices, setSelectedIndices] = useState(['NIFTY_50']);
    const [selectedSectors, setSelectedSectors] = useState([]);

    const [rsRatings, setRsRatings] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [currentPageName, setCurrentPageName] = useState('dashboard');

    // Update isMobile on resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const timeframeConfig = {
        hourly: { range: '5d', interval: '1h', label: 'Hourly' },
        daily: { range: '1y', interval: '1d', label: 'Daily' },
        weekly: { range: '5y', interval: '1wk', label: 'Weekly' },
        monthly: { range: '10y', interval: '1mo', label: 'Monthly' }
    };

    // RS Calculation logic
    const calculateRSScore = (data) => {
        if (!data || data.length < 50) return null;
        const getReturn = (days) => {
            const last = data[data.length - 1].close;
            const targetIdx = Math.max(0, data.length - 1 - days);
            const prev = data[targetIdx].close;
            return ((last - prev) / prev) * 100;
        };
        const ret3m = getReturn(Math.min(63, data.length - 1));
        const ret6m = getReturn(Math.min(126, data.length - 1));
        const ret9m = getReturn(Math.min(189, data.length - 1));
        const ret12m = getReturn(Math.min(252, data.length - 1));
        return (0.4 * ret3m) + (0.2 * ret6m) + (0.2 * ret9m) + (0.2 * ret12m);
    };

    const updateRSRatings = () => {
        const scores = [];
        displayedStocks.forEach(stock => {
            const data = gridData[stock.symbol];
            const score = calculateRSScore(data);
            if (score !== null) scores.push({ symbol: stock.symbol, score });
        });
        if (scores.length === 0) return;
        scores.sort((a, b) => a.score - b.score);
        const newRatings = {};
        scores.forEach((item, index) => {
            const rank = Math.round((index / (scores.length - 1)) * 98) + 1;
            newRatings[item.symbol] = rank;
        });
        setRsRatings(newRatings);
    };

    useEffect(() => {
        updateRSRatings();
    }, [gridData, displayedStocks.map(s => s.symbol).join(',')]);

    const loadGridData = async (stocksToLoad = displayedStocks, force = false) => {
        if (!stocksToLoad || stocksToLoad.length === 0) return;
        const config = timeframeConfig[timeframe];
        const newData = { ...gridData };
        const batchSize = 10;
        let maxTimestamp = 0;

        for (let i = 0; i < stocksToLoad.length; i += batchSize) {
            const batch = stocksToLoad.slice(i, i + batchSize);
            await Promise.all(batch.map(async (stock) => {
                try {
                    const result = await fetchStockData(stock.symbol, config.range, config.interval, force);
                    const data = repairData(result.data);
                    if (data && data.length > 0) {
                        newData[stock.symbol] = data;
                        const latestPoint = data[data.length - 1];
                        if (latestPoint.time * 1000 > maxTimestamp) {
                            maxTimestamp = latestPoint.time * 1000;
                        }
                        if (stock.symbol === selectedStock?.symbol && result.metadata && Object.keys(result.metadata).length > 0) {
                            setSelectedMetadata(result.metadata);
                        }
                    }
                } catch (err) {
                    console.error(`Failed to load data for ${stock.symbol}`, err);
                }
            }));
            setGridData({ ...newData });
        }
        if (maxTimestamp > 0) setLastUpdated(new Date(maxTimestamp));
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadGridData(displayedStocks, true);
        setIsRefreshing(false);
    };

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.body.classList.toggle('light-theme', theme === 'light');
    }, [theme]);

    const ITEMS_PER_PAGE = 20;


    // Corrected Filtering Logic (use active watchlist)
    useEffect(() => {
        let stocks = new Set();
        if (currentPageName === 'watchlist' || activeFilter === 'WATCHLIST') {
            setDisplayedStocks(watchlist);
            setCurrentPage(1);
            return;
        }

        selectedIndices.forEach(index => {
            if (INDICES[index]) INDICES[index].forEach(symbol => stocks.add(symbol));
        });
        selectedSectors.forEach(sector => {
            if (SECTORS[sector]) SECTORS[sector].forEach(symbol => stocks.add(symbol));
        });

        if (stocks.size === 0 && selectedIndices.length === 0 && selectedSectors.length === 0) {
            INDICES.NIFTY_50.forEach(symbol => stocks.add(symbol));
        }


        const stockArray = Array.from(stocks).map(symbol => ({
            symbol,
            name: symbolNameMap[symbol] || symbol,
            price: 0, change: 0, volume: 0
        }));

        setDisplayedStocks(stockArray);
        setCurrentPage(1);
    }, [activeFilter, (watchlist || []).length, (watchlist || []).map(s => s.symbol).join(','), selectedIndices.join(','), selectedSectors.join(','), currentPageName, activeWatchlistId]);

    // Throttled load
    useEffect(() => {
        if (viewMode === 'grid' && displayedStocks.length > 0) {
            loadGridData();
        }
    }, [displayedStocks.map(s => s.symbol).join(','), timeframe, viewMode]);



    const [liveStatus, setLiveStatus] = useState(false);

    useEffect(() => {
        let lastTimestampUpdate = 0;
        const handleLiveUpdate = async (liveUpdate) => {
            const symbol = liveUpdate.id;
            if (liveUpdate.type === 'STALE_DATA_RECOVERY') {
                const result = await fetchStockData(symbol, timeframeConfig[timeframe].range, timeframeConfig[timeframe].interval, true);
                if (result.data?.length > 0) {
                    const repaired = repairData(result.data);
                    setGridData(prev => ({ ...prev, [symbol]: repaired }));

                    // Sync timestamp with the reclaimed data
                    const latest = repaired[repaired.length - 1];
                    if (latest?.time) setLastUpdated(new Date(latest.time * 1000));
                }
                return;
            }

            const newPrice = liveUpdate.price;
            if (!symbol || !newPrice) return;

            setWatchlist(prev => prev.map(s =>
                s.symbol === symbol ? { ...s, price: newPrice, change: liveUpdate.changePercent || s.change } : s
            ));

            setSelectedStock(prev => (prev && prev.symbol === symbol)
                ? { ...prev, price: newPrice, change: liveUpdate.changePercent || prev.change }
                : prev
            );

            // Note: We no longer update lastUpdated here to keep it tied to the chart/grid data
        };

        streamingService.addListener(handleLiveUpdate);
        streamingService.onStatusChange = (status) => setLiveStatus(status);
        streamingService.connect();

        return () => {
            streamingService.removeListener(handleLiveUpdate);
            streamingService.disconnect();
        };
    }, []);

    useEffect(() => {
        if (watchlist.length > 0) streamingService.subscribe(watchlist.map(s => s.symbol));
    }, [watchlist.length, activeWatchlistId]);

    useEffect(() => {
        if (displayedStocks.length > 0) streamingService.subscribe(displayedStocks.map(s => s.symbol));
    }, [displayedStocks.map(s => s.symbol).join(',')]);

    const loadStockStats = async (symbols) => {
        if (!symbols || symbols.length === 0) return;
        try {
            const results = await fetchStockStats(symbols.join(','));
            setStockStats(prev => {
                const updated = { ...prev };
                results.forEach(stat => { if (stat.symbol) updated[stat.symbol] = stat; });
                return updated;
            });
        } catch (err) { console.error(`[Stats] Failed`, err); }
    };

    useEffect(() => {
        if (displayedStocks.length > 0) loadStockStats(displayedStocks.map(s => s.symbol));
    }, [displayedStocks.map(s => s.symbol).join(',')]);

    useEffect(() => {
        if (currentPageName === 'watchlist' && watchlist.length > 0) {
            if (!watchlist.find(s => s.symbol === selectedStock?.symbol)) setSelectedStock(watchlist[0]);
        }
    }, [currentPageName, watchlist.length, selectedStock?.symbol]);

    useEffect(() => {
        if (selectedStock?.symbol) fetchRecommendations(selectedStock.symbol).then(recs => setRecommendations(recs));
    }, [selectedStock?.symbol]);

    return (
        <StockContext.Provider value={{
            selectedStock, setSelectedStock,
            // Watchlist multi
            watchlists, activeWatchlistId, setActiveWatchlistId, activeWatchlist,
            createWatchlist, renameWatchlist, deleteWatchlist, switchWatchlist,
            watchlist, addToWatchlist, removeFromWatchlist,
            viewMode, setViewMode, activeFilter, setActiveFilter, displayedStocks,
            currentPage, setCurrentPage, gridColumns, setGridColumns, lastUpdated, setLastUpdated,
            theme, setTheme, gridData, setGridData, stockStats, rsRatings, isMobile,
            isRefreshing, handleRefresh, timeframe, setTimeframe, timeframeConfig,
            sortOrder, setSortOrder, selectedIndices, setSelectedIndices, selectedSectors, setSelectedSectors,
            currentPageName, setCurrentPageName, liveStatus, recommendations, selectedMetadata,
            getPaginatedStocks: () => {
                let stocks = [...displayedStocks];
                if (sortOrder === 'rs_desc') stocks.sort((a, b) => (rsRatings[b.symbol] || 0) - (rsRatings[a.symbol] || 0));
                else if (sortOrder === 'rs_asc') stocks.sort((a, b) => (rsRatings[a.symbol] || 100) - (rsRatings[b.symbol] || 100));
                const start = (currentPage - 1) * ITEMS_PER_PAGE;
                return stocks.slice(start, start + ITEMS_PER_PAGE);
            },
            totalPages: Math.ceil(displayedStocks.length / ITEMS_PER_PAGE)
        }}>
            {children}
        </StockContext.Provider>
    );
};
