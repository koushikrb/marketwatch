import React, { useState } from 'react';
import '../styles/Layout.css';
import { Menu, Search, BarChart2, List, Settings, Sun, Moon, RefreshCw } from 'lucide-react';
import { useStock } from '../utils/StockContext';
import { fetchStockData, searchStocks } from '../utils/yahooFinanceService';
import { useEffect } from 'react';

const Header = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const {
        setSelectedStock,
        watchlist,
        addToWatchlist,
        setViewMode,
        theme,
        setTheme,
        lastUpdated,
        setActiveFilter,
        handleRefresh,
        isRefreshing,
        currentPageName,
        setCurrentPageName,
        setLastUpdated,
        liveStatus
    } = useStock();

    const [loading, setLoading] = useState(false);

    const formatIST = (date) => {
        if (!date) return 'Never';
        return new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kolkata'
        }).format(date) + ' IST';
    };

    const handleLogoClick = () => {
        setActiveFilter('NIFTY_50');
        setViewMode('grid');
        setCurrentPageName('dashboard');
        setSearchTerm('');
    };

    // Debounced search for suggestions
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length > 0) {
                const results = await searchStocks(searchTerm);
                setSuggestions(results);
                setShowSuggestions(results.length > 0);
                console.log(`[Search] Found ${results.length} suggestions for "${searchTerm}"`);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300); // Increased debounce for smoother experience

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.search-bar')) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectStock = async (stock) => {
        console.log(`[Search] Selected: ${stock.symbol} (${stock.name})`);
        setSearchTerm('');
        setSuggestions([]);
        setShowSuggestions(false);
        setLoading(true);

        try {
            const result = await fetchStockData(stock.symbol);
            const data = result?.data || [];
            console.log(`[Search] Fetched data for ${stock.symbol}: ${data.length} points`);

            if (data.length > 0) {
                const last = data[data.length - 1];
                const prev = data[data.length - 2] || last;
                const change = ((last.close - prev.close) / prev.close) * 100;

                if (last.time) {
                    setLastUpdated(new Date(last.time * 1000));
                }

                const newStock = {
                    symbol: stock.symbol,
                    name: stock.name,
                    price: last.close,
                    change: change,
                    volume: last.volume
                };

                addToWatchlist(newStock);
                setSelectedStock(newStock);

                // Open the dedicated stock detail page
                setCurrentPageName('stock-detail');
                console.log(`[Search] Opened Stock Detail for ${stock.symbol}`);
            } else {
                console.warn(`[Search] No history data found for ${stock.symbol}`);
                const fallbackStock = {
                    symbol: stock.symbol,
                    name: stock.name,
                    price: 0,
                    change: 0,
                    volume: 0
                };
                addToWatchlist(fallbackStock);
                setSelectedStock(fallbackStock);
                setCurrentPageName('dashboard');
                setViewMode('list');
            }
        } catch (err) {
            console.error(`[Search] Error selecting stock ${stock.symbol}:`, err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (suggestions.length > 0) {
            handleSelectStock(suggestions[0]);
        }
    };

    return (
        <header className="header">
            <div className="logo" onClick={handleLogoClick}>
                <BarChart2 color="#00E396" size={24} />
                <span>NSE Screener</span>
            </div>
            <div className="header-center">
                <nav className="header-tabs">
                    <button
                        className={`header-tab ${currentPageName === 'dashboard' ? 'active' : ''}`}
                        onClick={() => {
                            setCurrentPageName('dashboard');
                            setViewMode('grid');
                        }}
                    >
                        Market
                    </button>
                    <button
                        className={`header-tab ${currentPageName === 'search' ? 'active' : ''}`}
                        onClick={() => setCurrentPageName('search')}
                    >
                        Search
                    </button>
                    <button
                        className={`header-tab ${currentPageName === 'watchlist' ? 'active' : ''}`}
                        onClick={() => setCurrentPageName('watchlist')}
                    >
                        Watchlist
                    </button>
                </nav>

                <form className="compact-search" onSubmit={(e) => e.preventDefault()}>
                    <Search size={14} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
                        disabled={loading}
                    />

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="search-suggestions compact-suggestions">
                            {suggestions.map((s, idx) => (
                                <div
                                    key={s.symbol + idx}
                                    className="suggestion-item"
                                    onClick={() => handleSelectStock(s)}
                                >
                                    <div className="suggestion-symbol">{s.symbol.replace('.NS', '')}</div>
                                    <div className="suggestion-name">{s.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </form>
            </div>
            <div className="header-actions">
                <button
                    className="refresh-btn header-refresh"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    title="Refresh All Data"
                >
                    <RefreshCw size={18} className={isRefreshing ? 'spinning' : ''} />
                    <span>Refresh</span>
                </button>
                <div className="connection-status">
                    <div className={`status-dot ${liveStatus ? 'live' : 'offline'}`}></div>
                    <span className="status-text">{liveStatus ? 'LIVE' : 'SYNCING'}</span>
                </div>
                <div className="last-updated">
                    <span className="updated-label">Updated:</span>
                    <span className="updated-time">{formatIST(lastUpdated)}</span>
                </div>
                <button
                    className="theme-toggle"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </header>
    );
};

const Sidebar = () => {
    const { activeFilter, setActiveFilter, setViewMode, currentPageName, setCurrentPageName } = useStock();

    const filters = [
        { id: 'NIFTY_50', label: 'Nifty 50', icon: <BarChart2 size={20} /> },
        { id: 'NIFTY_BANK', label: 'Nifty Bank', icon: <BarChart2 size={20} /> },
        { id: 'NIFTY_DEFENCE', label: 'Defence', icon: <BarChart2 size={20} /> },
        { id: 'NIFTY_MIDCAP_150', label: 'Midcap 150', icon: <BarChart2 size={20} /> },
        { id: 'NIFTY_SMALLCAP_250', label: 'Smallcap 250', icon: <BarChart2 size={20} /> },
        { id: 'NIFTY_MICROCAP_250', label: 'Microcap 250', icon: <BarChart2 size={20} /> },
        { id: 'NIFTY_500', label: 'Nifty 500', icon: <BarChart2 size={20} /> },
    ];

    return (
        <aside className="sidebar">
            <nav>
                <div className="nav-group">
                    <span className="nav-label">Market Indices</span>
                    {filters.map(f => (
                        <a
                            key={f.id}
                            href="#"
                            className={`nav-item ${activeFilter === f.id && currentPageName === 'dashboard' ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                setCurrentPageName('dashboard');
                                setActiveFilter(f.id);
                                setViewMode('grid');
                            }}
                        >
                            {f.icon}
                            <span>{f.label}</span>
                        </a>
                    ))}
                </div>
            </nav>
        </aside>
    );
};

const Layout = ({ children }) => {
    return (
        <div className="app-layout">
            <Header />
            <main className="content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
