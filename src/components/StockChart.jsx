import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { useStock } from '../utils/StockContext';
import streamingService from '../utils/YahooStreamingService';
import '../styles/StockChart.css';

const StockChart = ({ data, symbol }) => {
    const chartContainerRef = useRef();
    const candlestickSeriesRef = useRef();
    const volumeSeriesRef = useRef();
    const { theme, rsRatings } = useStock();
    const rsRank = rsRatings?.[symbol];

    useEffect(() => {
        if (!data || data.length === 0) return;

        const isLight = theme === 'light';
        const textColor = isLight ? '#4a4a4a' : '#8b949e';
        const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';

        // Determine resolution
        let isIntraday = false;
        if (data.length > 1) {
            const avgGap = (data[data.length - 1].time - data[0].time) / data.length;
            isIntraday = avgGap < 3600 * 5; // Less than 5 hour average gap = Intraday
        }

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: textColor,
                fontFamily: "'Inter', sans-serif",
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            localization: {
                dateFormat: 'yyyy-MM-dd',
                timeFormatter: (time) => {
                    const date = new Date(time * 1000);
                    if (!isIntraday) {
                        return new Intl.DateTimeFormat('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Asia/Kolkata'
                        }).format(date);
                    }
                    return new Intl.DateTimeFormat('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'Asia/Kolkata'
                    }).format(date);
                },
            },
            timeScale: {
                timeVisible: isIntraday,
                secondsVisible: false,
                borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                fixLeftEdge: true,
                fixRightEdge: true,
                tickMarkFormatter: (time, tickMarkType) => {
                    const date = new Date(time * 1000);
                    // For day/month labels, use standard behavior
                    if (!isIntraday) return null;

                    // For intraday, force IST HH:mm
                    return new Intl.DateTimeFormat('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'Asia/Kolkata'
                    }).format(date);
                },
            },
            rightPriceScale: {
                borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    width: 1,
                    color: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255, 255, 255, 0.2)',
                    style: 0,
                    labelBackgroundColor: isLight ? '#ffffff' : '#161b22',
                },
                horzLine: {
                    width: 1,
                    color: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255, 255, 255, 0.2)',
                    style: 0,
                    labelBackgroundColor: isLight ? '#ffffff' : '#161b22',
                },
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        // 1. Candlestick Series
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#00E396',
            downColor: '#FF4560',
            borderVisible: false,
            wickUpColor: '#00E396',
            wickDownColor: '#FF4560',
        });
        candlestickSeriesRef.current = candlestickSeries;

        // Safety: Ensure data is sorted
        const validData = [...data]
            .filter(d =>
                d.time !== undefined && d.time !== null &&
                !isNaN(d.open) && !isNaN(d.high) && !isNaN(d.low) && !isNaN(d.close)
            )
            .sort((a, b) => (typeof a.time === 'string' ? a.time.localeCompare(b.time) : a.time - b.time));

        // Deduplicate
        const uniqueData = [];
        const seen = new Set();
        for (const item of validData) {
            if (!seen.has(item.time)) {
                seen.add(item.time);
                uniqueData.push(item);
            }
        }

        if (uniqueData.length > 0) {
            try {
                candlestickSeries.setData(uniqueData);
            } catch (e) {
                console.error(`[Chart] Error setting candlestick data for ${symbol}`, e);
            }
        }

        // 2. Volume Series (Histogram)
        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });
        volumeSeriesRef.current = volumeSeries;

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        const volumeData = uniqueData
            .map(d => ({
                time: d.time,
                value: typeof d.volume === 'number' && !isNaN(d.volume) ? d.volume : 0,
                color: d.close >= d.open ? 'rgba(0, 227, 150, 0.25)' : 'rgba(255, 69, 96, 0.25)',
            }));

        try {
            volumeSeries.setData(volumeData);
        } catch (e) {
            console.error(`[Chart] Error setting volume data for ${symbol}`, e);
        }

        // 3. EMA 21 Series
        const calculateEMA = (items, count) => {
            if (items.length === 0) return [];
            const k = 2 / (count + 1);
            const emaData = [];
            let ema = items[0].close;

            for (let i = 0; i < items.length; i++) {
                const close = items[i].close;
                if (isNaN(close)) continue;
                ema = close * k + ema * (1 - k);
                if (!isNaN(ema)) {
                    emaData.push({ time: items[i].time, value: ema });
                }
            }
            return emaData;
        };

        const ema21Data = calculateEMA(uniqueData, 21);
        const emaSeries = chart.addSeries(LineSeries, {
            color: 'rgba(41, 182, 255, 0.4)',
            lineWidth: 1,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        try {
            if (ema21Data.length > 0) {
                emaSeries.setData(ema21Data);
            }
        } catch (e) {
            console.error(`[Chart] Error setting EMA data for ${symbol}`, e);
        }


        // Always scroll to the latest candle after data/layout changes
        chart.timeScale().fitContent();
        setTimeout(() => {
            try {
                chart.timeScale().scrollToRealTime();
            } catch (e) {}
        }, 0);

        // 4. Handle Live Updates

        const handleLiveUpdate = (liveUpdate) => {
            if (liveUpdate.id !== symbol) return;

            // Get the last data point's time to decide whether to update or append
            const lastPoint = uniqueData[uniqueData.length - 1];
            if (!lastPoint) return;

            const updateTime = Math.floor(Date.now() / 1000);

            // For simplicity, we update the current day's/minute's candle
            // If the series time is daily, we check if today's date matches. 
            // In Lightweight charts, if we send the same 'time', it updates the candle.

            try {
                candlestickSeriesRef.current.update({
                    time: lastPoint.time, // Update the last known candle with latest price
                    open: liveUpdate.openPrice || lastPoint.open,
                    high: Math.max(liveUpdate.dayHigh || 0, liveUpdate.price),
                    low: Math.min(liveUpdate.dayLow || 999999, liveUpdate.price),
                    close: liveUpdate.price,
                });

                if (liveUpdate.dayVolume) {
                    volumeSeriesRef.current.update({
                        time: lastPoint.time,
                        value: liveUpdate.dayVolume,
                        color: liveUpdate.price >= (liveUpdate.openPrice || lastPoint.open) ? 'rgba(0, 227, 150, 0.25)' : 'rgba(255, 69, 96, 0.25)',
                    });
                }
                console.log(`[Chart] Live update applied for ${symbol}: ${liveUpdate.price}`);
            } catch (err) {
                console.warn('[Chart] Failed live update:', err);
            }
        };
        streamingService.addListener(handleLiveUpdate);



        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
            const newRect = entries[0].contentRect;
            chart.applyOptions({ width: newRect.width, height: newRect.height });
            // After resize, scroll to latest candle
            setTimeout(() => {
                try {
                    chart.timeScale().scrollToRealTime();
                } catch (e) {}
            }, 0);
        });
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            streamingService.removeListener(handleLiveUpdate);
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [data, symbol, theme]);

    return (
        <div className="chart-wrapper">
            {rsRank !== undefined && rsRank !== null && !isNaN(rsRank) && (
                <div className={`chart-rs-badge ${rsRank >= 80 ? 'rs-high' : rsRank < 40 ? 'rs-low' : 'rs-mid'}`}>
                    RS: {rsRank}
                </div>
            )}
            <div ref={chartContainerRef} className="chart-container" />
        </div>
    );
};

export default StockChart;
