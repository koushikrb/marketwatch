
import React, { useState } from 'react';
import { useStock } from '../utils/StockContext';
import StockGrid from '../components/StockGrid';
import '../styles/Dashboard.css';


const WatchlistPage = () => {
    const {
        watchlists, activeWatchlistId, setActiveWatchlistId, activeWatchlist,
        createWatchlist, renameWatchlist, deleteWatchlist, switchWatchlist,
        watchlist
    } = useStock();
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    // Manage modal state (must be before any use)
    const [showManage, setShowManage] = useState(false);

    // Empty state: only if no watchlists at all
    if (!watchlists.length) {
        return (
            <div className="empty-watchlist">
                <div className="empty-content">
                    <h2>No Watchlists</h2>
                    <button className="glass-btn" onClick={() => createWatchlist('New Watchlist')}>Create New Watchlist</button>
                </div>
            </div>
        );
    }

    return (
        <div className="watchlist-grid-layout">
            <div className="watchlist-tabs-row">
                <div className="watchlist-tabs">
                    {watchlists.map((wl, idx) => {
                        // Generate a color for each tab (cycle through a palette)
                        const tabColors = [
                            '#29b6ff', '#00e396', '#ff4560', '#feb019', '#775dd0', '#ff66c3', '#3f51b5', '#f86624', '#2ccdc9', '#546e7a'
                        ];
                        const color = tabColors[idx % tabColors.length];
                        // Drag-and-drop logic
                        let dragStartIdx = null;
                        return (
                            <div
                                key={wl.id}
                                className={`watchlist-tab${wl.id === activeWatchlistId ? ' active' : ''}`}
                                style={{ borderBottomColor: wl.id === activeWatchlistId ? color : undefined, color: wl.id === activeWatchlistId ? color : undefined }}
                                onClick={() => switchWatchlist(wl.id)}
                                draggable
                                onDragStart={e => { dragStartIdx = idx; e.dataTransfer.effectAllowed = 'move'; }}
                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                onDrop={e => {
                                    e.preventDefault();
                                    const fromIdx = dragStartIdx;
                                    const toIdx = idx;
                                    if (fromIdx !== null && fromIdx !== toIdx) {
                                        // Reorder watchlists
                                        const newList = [...watchlists];
                                        const [moved] = newList.splice(fromIdx, 1);
                                        newList.splice(toIdx, 0, moved);
                                        // Update context
                                        window.dispatchEvent(new CustomEvent('reorderWatchlists', { detail: { newList } }));
                                    }
                                }}
                            >
                                {renamingId === wl.id ? (
                                    <input
                                        className="glass-input tab-rename-input"
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onBlur={() => { renameWatchlist(wl.id, renameValue); setRenamingId(null); }}
                                        onKeyDown={e => { if (e.key === 'Enter') { renameWatchlist(wl.id, renameValue); setRenamingId(null); }}}
                                        autoFocus
                                    />
                                ) : (
                                    <span onDoubleClick={() => { setRenamingId(wl.id); setRenameValue(wl.label); }}>{wl.label}</span>
                                )}
                            </div>
                        );
                    })}
                    <button className="tab-add-btn" onClick={() => createWatchlist('New Watchlist')} title="Add New Watchlist">+</button>
                    <div className="watchlist-tab manage-tab" onClick={() => setShowManage(true)}>
                        <span>Manage</span>
                    </div>
                </div>
                {/* Manage Watchlists Modal */}
                {/* Manage Watchlists Modal */}
                {showManage && (
                    <div className="manage-modal-bg" onClick={() => setShowManage(false)}>
                        <div className="manage-modal" onClick={e => e.stopPropagation()}>
                            <h2>Manage Watchlists</h2>
                            <ul className="manage-list">
                                {watchlists.map((wl, idx) => {
                                    const tabColors = [
                                        '#29b6ff', '#00e396', '#ff4560', '#feb019', '#775dd0', '#ff66c3', '#3f51b5', '#f86624', '#2ccdc9', '#546e7a'
                                    ];
                                    const color = tabColors[idx % tabColors.length];
                                    // Icon picker
                                    const iconList = ['📒','📈','💼','⭐','🔔','💰','🧮','📝','🧑‍💻','🏦','🧲','🦄','🌟','🚀','🧠','🧊','🦉','🦅','🦋','🦓','🦕'];
                                    return (
                                        <li key={wl.id} style={{ borderLeft: `4px solid ${color}` }}>
                                            <span style={{ color, fontWeight: wl.id === activeWatchlistId ? 700 : 500, fontSize: 18, marginRight: 8 }}>{wl.icon || '📒'}</span>
                                            <span style={{ color, fontWeight: wl.id === activeWatchlistId ? 700 : 500 }}>{wl.label}</span>
                                            <button className="glass-btn danger" style={{ marginLeft: 12 }} disabled={watchlists.length === 1} onClick={() => deleteWatchlist(wl.id)}>Delete</button>
                                            <button className="glass-btn" style={{ marginLeft: 8 }} onClick={() => { setRenamingId(wl.id); setRenameValue(wl.label); setShowManage(false); }}>Rename</button>
                                        </li>
                                    );
                                })}
                            </ul>
                            <button className="glass-btn" style={{ marginTop: 16 }} onClick={() => { createWatchlist('New Watchlist'); }}>+ Add New Watchlist</button>
                            <button className="glass-btn" style={{ marginLeft: 12, marginTop: 16 }} onClick={() => setShowManage(false)}>Close</button>
                            <button className="glass-btn" style={{ marginLeft: 12, marginTop: 16 }} onClick={() => {
                                // Export current watchlist as CSV
                                const wl = activeWatchlist;
                                if (!wl || !wl.stocks || wl.stocks.length === 0) return;
                                const csv = [
                                    'Symbol,Price,Change,Volume',
                                    ...wl.stocks.map(s => `${s.symbol},${s.price},${s.change},${s.volume}`)
                                ].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${wl.label.replace(/[^a-zA-Z0-9]/g,'_')}_watchlist.csv`;
                                document.body.appendChild(a);
                                a.click();
                                setTimeout(() => {
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                }, 100);
                            }}>Export Current Watchlist</button>
                        </div>
                    </div>
                )}
            </div>
            <div className="watchlist-charts-row">
                {watchlist.length === 0 ? (
                    <div className="empty-content" style={{ padding: '2rem', textAlign: 'center' }}>
                        <div style={{ marginBottom: 24 }}>
                            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="10" y="30" width="100" height="60" rx="12" fill="#23242a" stroke="#29b6ff" strokeWidth="2"/>
                                <rect x="25" y="45" width="70" height="30" rx="6" fill="#181a20" stroke="#29b6ff" strokeWidth="1"/>
                                <circle cx="60" cy="60" r="8" fill="#29b6ff"/>
                                <text x="60" y="90" textAnchor="middle" fontSize="16" fill="#29b6ff">Empty</text>
                            </svg>
                        </div>
                        <h2>This watchlist is empty</h2>
                        <p>Add stocks from the dashboard to track them here.</p>
                    </div>
                ) : (
                    <StockGrid />
                )}
            </div>
        </div>
    );
};

export default WatchlistPage;
