import React from 'react';
import { useStock } from '../utils/StockContext';
import '../styles/AnalystRecs.css';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const AnalystRecs = () => {
    const { recommendations } = useStock();

    if (!recommendations || recommendations.length === 0) {
        return (
            <div className="analyst-recs-empty glass-panel">
                <h4>Analyst Recommendations</h4>
                <p>No recommendation data available for this ticker.</p>
            </div>
        );
    }

    // Usually Yahoo gives a list of trends for different months. We'll take the most recent one.
    const latest = recommendations[0];

    // Calculate total to get percentages for the bar
    const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;

    const getWidth = (val) => `${(val / total) * 100}%`;

    const getConsensus = () => {
        const score = (latest.strongBuy * 2) + (latest.buy * 1) + (latest.hold * 0) + (latest.sell * -1) + (latest.strongSell * -2);
        if (score > total * 0.5) return { label: 'Strong Buy', class: 'strong-buy', icon: <TrendingUp /> };
        if (score > 0) return { label: 'Buy', class: 'buy', icon: <TrendingUp /> };
        if (score < -total * 0.5) return { label: 'Strong Sell', class: 'strong-sell', icon: <TrendingDown /> };
        if (score < 0) return { label: 'Sell', class: 'sell', icon: <TrendingDown /> };
        return { label: 'Hold', class: 'hold', icon: <Minus /> };
    };

    const consensus = getConsensus();

    return (
        <div className="analyst-recs glass-panel">
            <div className="recs-header">
                <h3>Analyst Recommendations</h3>
                <div className={`consensus-badge ${consensus.class}`}>
                    {consensus.icon}
                    <span>{consensus.label}</span>
                </div>
            </div>

            <div className="recs-chart-container">
                <div className="recs-bar">
                    <div className="bar-segment strong-buy" style={{ width: getWidth(latest.strongBuy) }} title={`Strong Buy: ${latest.strongBuy}`} />
                    <div className="bar-segment buy" style={{ width: getWidth(latest.buy) }} title={`Buy: ${latest.buy}`} />
                    <div className="bar-segment hold" style={{ width: getWidth(latest.hold) }} title={`Hold: ${latest.hold}`} />
                    <div className="bar-segment sell" style={{ width: getWidth(latest.sell) }} title={`Sell: ${latest.sell}`} />
                    <div className="bar-segment strong-sell" style={{ width: getWidth(latest.strongSell) }} title={`Strong Sell: ${latest.strongSell}`} />
                </div>
                <div className="recs-legend">
                    <div className="legend-item"><span className="dot strong-buy"></span> Strong Buy ({latest.strongBuy})</div>
                    <div className="legend-item"><span className="dot buy"></span> Buy ({latest.buy})</div>
                    <div className="legend-item"><span className="dot hold"></span> Hold ({latest.hold})</div>
                    <div className="legend-item"><span className="dot sell"></span> Sell ({latest.sell})</div>
                    <div className="legend-item"><span className="dot strong-sell"></span> Strong Sell ({latest.strongSell})</div>
                </div>
            </div>

            <div className="recs-footer">
                <span className="period-label">Period: {latest.period}</span>
                <span className="total-analysts">Based on {total} analysts</span>
            </div>
        </div>
    );
};

export default AnalystRecs;
