import React, { useState } from 'react';
import '../styles/ScreenerTable.css';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useStock } from '../utils/StockContext';

const ScreenerTable = ({ stocks, onSelectStock }) => {
    const { rsRatings } = useStock();
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    const sortedStocks = React.useMemo(() => {
        let sortableItems = stocks.map(stock => ({
            ...stock,
            rsRank: rsRatings[stock.symbol] || 0
        }));

        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal < bVal) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [stocks, sortConfig, rsRatings]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name) => {
        if (sortConfig.key !== name) return null;
        return sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    }

    return (
        <div className="screener-table-container">
            <table className="screener-table">
                <thead>
                    <tr>
                        <th onClick={() => requestSort('symbol')}>Symbol {getSortIcon('symbol')}</th>
                        <th onClick={() => requestSort('rsRank')}>RS Rating {getSortIcon('rsRank')}</th>
                        <th onClick={() => requestSort('price')}>Price {getSortIcon('price')}</th>
                        <th onClick={() => requestSort('change')}>Change % {getSortIcon('change')}</th>
                        <th onClick={() => requestSort('volume')}>Volume {getSortIcon('volume')}</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedStocks.map((stock) => (
                        <tr key={stock.symbol} onClick={() => onSelectStock(stock)}>
                            <td className="symbol-cell">{stock.symbol.replace('.NS', '')}</td>
                            <td>
                                {stock.rsRank > 0 ? (
                                    <span className={`rs-badge ${stock.rsRank >= 80 ? 'rs-high' : stock.rsRank < 40 ? 'rs-low' : 'rs-mid'}`}>
                                        {stock.rsRank}
                                    </span>
                                ) : '-'}
                            </td>
                            <td>{stock.price > 0 ? stock.price.toFixed(2) : '-'}</td>
                            <td className={stock.change >= 0 ? 'text-green' : 'text-red'}>
                                {stock.change !== 0 ? (stock.change > 0 ? '+' : '') + stock.change.toFixed(2) + '%' : '-'}
                            </td>
                            <td>{stock.volume > 0 ? stock.volume.toLocaleString() : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ScreenerTable;
