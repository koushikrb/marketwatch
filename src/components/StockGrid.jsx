import React, { useEffect, useState } from 'react';
import { useStock } from '../utils/StockContext';
import StockChart from './StockChart';
import { fetchStockData } from '../utils/yahooFinanceService';
import '../styles/StockGrid.css';
import { ChevronLeft, ChevronRight, RefreshCw, Plus, Check } from 'lucide-react';
import FilterBar from './FilterBar';
import { INDICES, SECTORS, INDEX_LABELS, SECTOR_LABELS } from '../utils/indexData';

const StockGrid = ({ forceGridColumns, forceGridRows }) => {
    const {
        getPaginatedStocks,
        currentPage,
        setCurrentPage,
        totalPages,
        viewMode,
        gridColumns,
        setGridColumns,
        activeFilter,
        gridData,
        rsRatings,
        isRefreshing,
        handleRefresh,
        timeframe,
        setTimeframe,
        timeframeConfig,
        sortOrder,
        setSortOrder,
        selectedIndices,
        setSelectedIndices,
        selectedSectors,
        setSelectedSectors,
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        currentPageName,
        stockStats
    } = useStock();

    const calculateChange = (data) => {
        if (!data || data.length < 2) return null;
        const last = data[data.length - 1].close;
        const prev = data[data.length - 2].close;
        const change = ((last - prev) / prev) * 100;
        return change;
    };

    if (viewMode !== 'grid') return null;

    const isWatchlistPage = currentPageName === 'watchlist';
    // Force grid columns/rows if provided
    // Only force columns/rows if props are provided (for special layouts)
    const columns = typeof forceGridColumns === 'number' ? forceGridColumns : gridColumns;
    const rows = typeof forceGridRows === 'number' ? forceGridRows : undefined;

    return (
        <div className={`stock-grid-container ${isWatchlistPage ? 'no-sidebar' : ''}`}>
            {!isWatchlistPage && (
                <div className="filter-sidebar">
                    <FilterBar
                        selectedIndices={selectedIndices}
                        setSelectedIndices={setSelectedIndices}
                        selectedSectors={selectedSectors}
                        setSelectedSectors={setSelectedSectors}
                    />
                </div>
            )}

            <div className="grid-main-content">
                <div className="grid-controls">
                    <div className="control-group">
                        <span className="control-label">Timeframe:</span>
                        <select
                            className="glass-select"
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                        >
                            {Object.entries(timeframeConfig).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="control-divider"></div>

                    <div className="control-group">
                        <span className="control-label">Columns:</span>
                        <select
                            className="glass-select"
                            value={gridColumns}
                            onChange={(e) => setGridColumns(parseInt(e.target.value))}
                            disabled={!!forceGridColumns}
                        >
                            {[1, 2, 3, 4].map(num => (
                                <option key={num} value={num}>{num} Columns</option>
                            ))}
                        </select>
                    </div>

                    <div className="control-divider"></div>

                    <div className="control-group">
                        <span className="control-label">Sort:</span>
                        <select
                            className="glass-select"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="default">Default</option>
                            <option value="rs_desc">RS High to Low</option>
                            <option value="rs_asc">RS Low to High</option>
                        </select>
                    </div>
                </div>

                <div className="stock-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: rows ? `repeat(${rows}, 1fr)` : undefined }}>
                    {getPaginatedStocks().map(stock => {
                        const change = calculateChange(gridData[stock.symbol]);
                        const rsRank = rsRatings[stock.symbol];
                        const isInWatchlist = watchlist.some(s => s.symbol === stock.symbol);
                        const stats = stockStats[stock.symbol] ||
                            stockStats[stock.symbol.toUpperCase()] ||
                            stockStats[stock.symbol.toLowerCase()];

                        const formatCompact = (val, type) => {
                            if (val === undefined || val === null) return '-';
                            if (type === 'currency') {
                                if (val >= 1e12) return (val / 1e12).toFixed(1) + 'T';
                                if (val >= 1e7) return (val / 1e7).toFixed(0) + 'Cr';
                                return val.toLocaleString('en-IN');
                            }
                            if (type === 'percent') return (val * 100).toFixed(1) + '%';
                            if (type === 'number') return val.toFixed(1);
                            return val;
                        };

                        return (
                            <div key={stock.symbol} className={`grid-item ${isWatchlistPage ? 'with-stats' : ''}`}>
                                <div className="grid-item-header">
                                    <div className="symbol-group">
                                        <span className="symbol">{stock.symbol.replace('.NS', '')}</span>
                                        {change !== null && (
                                            <span className={`change-badge ${change >= 0 ? 'positive' : 'negative'}`}>
                                                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className={`add-watchlist-btn ${isInWatchlist ? 'shared' : ''}`}
                                        onClick={() => isInWatchlist ? removeFromWatchlist(stock.symbol) : addToWatchlist(stock)}
                                        title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                                    >
                                        {isInWatchlist ? <Check size={16} /> : <Plus size={16} />}
                                    </button>
                                </div>
                                <div className="grid-card-content">
                                    {/* Fundamentals removed for watchlist cards */}
                                    <div className="grid-chart-wrapper">
                                        {gridData[stock.symbol] ? (
                                            <StockChart data={gridData[stock.symbol]} symbol={stock.symbol} />
                                        ) : (
                                            <div className="loading-chart">Loading...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {
                    totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="page-btn"
                            >
                                <ChevronLeft size={20} />
                                Previous
                            </button>
                            <span className="page-info">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className="page-btn"
                            >
                                Next
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )
                }
            </div>
        </div >
    );
};

export default StockGrid;
