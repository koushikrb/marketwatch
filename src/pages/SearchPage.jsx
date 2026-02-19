import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, Star } from 'lucide-react';
import { useStock } from '../utils/StockContext';
import { searchStocks, fetchStockData } from '../utils/yahooFinanceService';
import StockChart from '../components/StockChart';
import '../styles/SearchPage.css';

const SearchPage = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selected, setSelected] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [chartLoading, setChartLoading] = useState(false);
    const [range, setRange] = useState('1y');
    const { stockStats, setLastUpdated, addToWatchlist, watchlist } = useStock();

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                try {
                    const data = await searchStocks(query);
                    setResults(data);
                    setShowDropdown(data.length > 0);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // When a new stock is selected, fetch chart data for the selected range
    useEffect(() => {
        if (!selected) return;
        setChartLoading(true);
        fetchStockData(selected.symbol, range, range === '1d' ? '5m' : range === '5d' ? '15m' : range === '1mo' ? '1d' : range === '6mo' ? '1d' : range === '1y' ? '1d' : '1wk')
            .then(result => {
                const data = result?.data || [];
                setChartData(data);
                if (data.length > 0) {
                    const last = data[data.length - 1];
                    if (last.time) setLastUpdated(new Date(last.time * 1000));
                }
            })
            .catch(console.error)
            .finally(() => setChartLoading(false));
    }, [selected, range]);

    const handleSelect = (stock) => {
        setSelected(stock);
        setShowDropdown(false);
        setQuery(stock.symbol.replace('.NS', ''));
    };

    const popularStocks = [
        { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
        { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
        { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
        { symbol: 'INFY.NS', name: 'Infosys' },
        { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' }
    ];

    return (
        <div className={selected ? 'search-detail-fullpage' : 'search-page-container glass'}>
            {!selected && (
                <>
                <div className="search-hero">
                    <h1>Find Your Next Trade</h1>
                    <p>Search over 5,000+ NSE stocks, indices, and sectors</p>
                    <div className="large-search-box" style={{position: 'relative'}}>
                        <Search className="search-icon-large" size={24} />
                        <input
                            type="text"
                            placeholder="Type symbol or name (e.g. RELIANCE)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        />
                        {loading && <div className="search-spinner"></div>}
                        {showDropdown && results.length > 0 && (
                            <div className="search-suggestions-dropdown">
                                {results.map((s, idx) => {
                                    const isInWatchlist = watchlist.some(w => w.symbol === s.symbol);
                                    return (
                                        <div
                                            key={s.symbol + idx}
                                            className="search-suggestion-item"
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onMouseDown={() => handleSelect(s)}>
                                                <span style={{color: 'var(--accent-blue)', fontWeight: 600}}>{s.symbol.replace('.NS', '')}</span>
                                                <span style={{marginLeft: 8, color: 'var(--text-secondary)'}}>{s.name}</span>
                                            </div>
                                            <button
                                                className={`add-watchlist-btn ${isInWatchlist ? 'shared' : ''}`}
                                                style={{ marginLeft: 10, width: 28, height: 28, borderRadius: 6, border: 'none', background: isInWatchlist ? '#e6fff2' : '#f5f5f5', color: isInWatchlist ? '#00E396' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isInWatchlist ? 'not-allowed' : 'pointer' }}
                                                title={isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                                                disabled={isInWatchlist}
                                                onMouseDown={e => { e.stopPropagation(); if (!isInWatchlist) addToWatchlist(s); }}
                                            >
                                                {isInWatchlist ? <span style={{fontSize: 16, fontWeight: 700}}>✓</span> : <span style={{fontSize: 18, fontWeight: 700}}>+</span>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                </>
            )}

            {selected ? (
                <div className="search-detail-layout">
                    <div className="search-detail-sidebar">
                        <div className="stock-desc-card glass">
                            <h2 className="stock-title">{selected.symbol.replace('.NS', '')} <span className="stock-name">{selected.name}</span></h2>
                            <table className="fundamentals-table">
                                <tbody>
                                    <tr><td>Symbol</td><td>{selected.symbol}</td></tr>
                                    <tr><td>Name</td><td>{selected.name}</td></tr>
                                    <tr><td>Price</td><td>₹{stockStats[selected.symbol]?.regularMarketPrice ?? '-'}</td></tr>
                                    <tr><td>Change</td><td>{stockStats[selected.symbol]?.regularMarketChangePercent ? stockStats[selected.symbol].regularMarketChangePercent.toFixed(2) + '%' : '-'}</td></tr>
                                    <tr><td>Volume</td><td>{stockStats[selected.symbol]?.regularMarketVolume?.toLocaleString() ?? '-'}</td></tr>
                                    <tr><td>Market Cap</td><td>{stockStats[selected.symbol]?.marketCap ? '₹' + stockStats[selected.symbol].marketCap.toLocaleString() : '-'}</td></tr>
                                    <tr><td>PE Ratio</td><td>{stockStats[selected.symbol]?.trailingPE ?? '-'}</td></tr>
                                    <tr><td>52W High</td><td>{stockStats[selected.symbol]?.fiftyTwoWeekHigh ?? '-'}</td></tr>
                                    <tr><td>52W Low</td><td>{stockStats[selected.symbol]?.fiftyTwoWeekLow ?? '-'}</td></tr>
                                    <tr><td>Sector</td><td>{stockStats[selected.symbol]?.sector ?? '-'}</td></tr>
                                    <tr><td>Exchange</td><td>{stockStats[selected.symbol]?.fullExchangeName ?? '-'}</td></tr>
                                </tbody>
                            </table>
                            {stockStats[selected.symbol]?.longBusinessSummary && (
                                <div className="stock-desc">
                                    <h4>Description</h4>
                                    <p>{stockStats[selected.symbol].longBusinessSummary}</p>
                                </div>
                            )}
                        </div>
                        <button className="back-btn" onClick={() => { setSelected(null); setChartData([]); setRange('1y'); }}>Back to Search</button>
                    </div>
                    <div className="search-detail-main">
                        <div className="range-selector" style={{marginBottom: 18}}>
                            {[
                                { label: '1D', value: '1d' },
                                { label: '5D', value: '5d' },
                                { label: '1M', value: '1mo' },
                                { label: '6M', value: '6mo' },
                                { label: '1Y', value: '1y' },
                                { label: '5Y', value: '5y' },
                            ].map(r => (
                                <button
                                    key={r.value}
                                    className={`range-btn ${range === r.value ? 'active' : ''}`}
                                    onClick={() => setRange(r.value)}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        {chartLoading ? (
                            <div className="loading-state">Loading chart...</div>
                        ) : (
                            <StockChart data={chartData} symbol={selected.symbol} />
                        )}
                    </div>
                </div>
            ) : (
                <div className="search-content">
                    {results.length > 0 ? (
                        <div className="search-results-grid">
                            <h3>Search Results</h3>
                            <div className="results-list">
                                {results.map((s, idx) => {
                                    const isInWatchlist = watchlist.some(w => w.symbol === s.symbol);
                                    return (
                                        <div key={s.symbol + idx} className="result-card glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div className="result-info" style={{ cursor: 'pointer' }} onClick={() => handleSelect(s)}>
                                                <span className="result-symbol">{s.symbol.replace('.NS', '')}</span>
                                                <span className="result-name">{s.name}</span>
                                            </div>
                                            <div className="result-action" style={{ display: 'flex', alignItems: 'center' }}>
                                                <button
                                                    className={`add-watchlist-btn ${isInWatchlist ? 'shared' : ''}`}
                                                    style={{ marginLeft: 10, width: 28, height: 28, borderRadius: 6, border: 'none', background: isInWatchlist ? '#e6fff2' : '#f5f5f5', color: isInWatchlist ? '#00E396' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isInWatchlist ? 'not-allowed' : 'pointer' }}
                                                    title={isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                                                    disabled={isInWatchlist}
                                                    onClick={e => { e.stopPropagation(); if (!isInWatchlist) addToWatchlist(s); }}
                                                >
                                                    {isInWatchlist ? <span style={{fontSize: 16, fontWeight: 700}}>✓</span> : <span style={{fontSize: 18, fontWeight: 700}}>+</span>}
                                                </button>
                                                <TrendingUp size={18} style={{ marginLeft: 8 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="search-suggestions-section">
                            <div className="suggestion-group">
                                <h3><TrendingUp size={18} /> Popular Stocks</h3>
                                <div className="suggestion-chips">
                                    {popularStocks.map(s => (
                                        <button key={s.symbol} onClick={() => handleSelect(s)} className="chip glass">
                                            {s.symbol.replace('.NS', '')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="market-indices-grid">
                                {/* Placeholder for more content if needed */}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchPage;
