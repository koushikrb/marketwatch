import React, { useState, useEffect, memo } from 'react';
import ScreenerTable from '../components/ScreenerTable';
import StockChart from '../components/StockChart';
import StockGrid from '../components/StockGrid';
import AnalystRecs from '../components/AnalystRecs';
import { fetchStockData } from '../utils/yahooFinanceService';
import { useStock } from '../utils/StockContext';
import streamingService from '../utils/YahooStreamingService';
import '../styles/Dashboard.css';

// Isolated component for heartbeat to prevent Dashboard re-renders
const HeartbeatIndicator = ({ symbol, watchlist, liveStatus }) => {
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        const watchlistSymbols = (watchlist || []).map(s => s.symbol).join(',');
        const handleTick = (message) => {
            if (message.id === symbol || watchlistSymbols.includes(message.id)) {
                setPulse(true);
                setTimeout(() => setPulse(false), 150);
            }
        };

        streamingService.addListener(handleTick);
        return () => streamingService.removeListener(handleTick);
    }, [symbol, (watchlist || []).length]);

    return (
        <span className={`live-pulse-indicator ${pulse ? 'active' : ''} ${liveStatus ? 'connected' : 'disconnected'}`}></span>
    );
};

const Dashboard = () => {
    const { selectedStock, setSelectedStock, watchlist, viewMode, activeFilter, selectedMetadata, liveStatus, setLastUpdated } = useStock();
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState('1y');

    const ranges = [
        { label: '1D', value: '1d', interval: '5m' },
        { label: '5D', value: '5d', interval: '15m' },
        { label: '1M', value: '1mo', interval: '1d' },
        { label: '6M', value: '6mo', interval: '1d' },
        { label: '1Y', value: '1y', interval: '1d' },
        { label: '5Y', value: '5y', interval: '1wk' },
    ];

    useEffect(() => {
        if (selectedStock && viewMode === 'list') {
            setLoading(true);
            const selectedRange = ranges.find(r => r.value === range);
            const interval = selectedRange ? selectedRange.interval : '1d';

            fetchStockData(selectedStock.symbol, range, interval)
                .then(result => {
                    const data = result?.data || [];
                    const formattedData = data.map(item => ({
                        ...item,
                        time: item.time,
                    }));
                    setChartData(formattedData);

                    // Sync the global 'last updated' time with the chart's latest point
                    if (data.length > 0) {
                        const last = data[data.length - 1];
                        setLastUpdated(new Date(last.time * 1000));
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [selectedStock?.symbol, range, viewMode]);

    if (viewMode === 'grid') {
        return (
            <div className="dashboard-container-grid">
                <StockGrid />
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="screener-section">
                <h2 className="section-title">Market Screener</h2>
                <ScreenerTable
                    stocks={watchlist}
                    onSelectStock={setSelectedStock}
                />
                <div className="dashboard-sidebar-widgets">
                    <AnalystRecs />
                </div>
            </div>
            <div className="chart-section">
                <div className="chart-header-row">
                    <div className="chart-header-info">
                        <h2 className="section-title">
                            {selectedStock.symbol.replace('.NS', '')}
                            <HeartbeatIndicator
                                symbol={selectedStock.symbol}
                                watchlist={watchlist}
                                liveStatus={liveStatus}
                            />
                        </h2>
                        {selectedMetadata.exchangeName && (
                            <div className="market-metadata">
                                <span className="market-badge">{selectedMetadata.exchangeName}</span>
                                <span className="currency-badge">{selectedMetadata.currency}</span>
                                <span className="timezone-badge">{selectedMetadata.timezone}</span>
                            </div>
                        )}
                    </div>
                    <div className="range-selector">
                        {ranges.map(r => (
                            <button
                                key={r.value}
                                className={`range-btn ${range === r.value ? 'active' : ''}`}
                                onClick={() => setRange(r.value)}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
                {loading ? (
                    <div className="loading-state">Loading chart data...</div>
                ) : (
                    <StockChart data={chartData} symbol={selectedStock.symbol} />
                )}
            </div>
        </div>
    );
};

export default Dashboard;
