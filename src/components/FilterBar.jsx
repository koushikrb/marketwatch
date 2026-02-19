import React from 'react';
import { Filter, X } from 'lucide-react';
import { INDEX_LABELS, SECTOR_LABELS } from '../utils/indexData';
import '../styles/FilterBar.css';

const FilterBar = ({
    selectedIndices,
    setSelectedIndices,
    selectedSectors,
    setSelectedSectors
}) => {

    // Only one index can be selected at a time
    const selectIndex = (index) => {
        if (selectedIndices[0] === index) {
            setSelectedIndices([]);
        } else {
            setSelectedIndices([index]);
        }
    };

    // Only one sector can be selected at a time
    const selectSector = (sector) => {
        if (selectedSectors[0] === sector) {
            setSelectedSectors([]);
        } else {
            setSelectedSectors([sector]);
        }
    };

    const clearAllFilters = () => {
        setSelectedIndices([]);
        setSelectedSectors([]);
    };

    const hasActiveFilters = selectedIndices.length > 0 || selectedSectors.length > 0;

    return (
        <div className="filter-bar">
            <div className="filter-header">
                <div className="filter-title">
                    <Filter size={20} />
                    <span>Filters</span>
                </div>
                {hasActiveFilters && (
                    <button className="clear-filters-btn" onClick={clearAllFilters}>
                        <X size={16} />
                        Clear All
                    </button>
                )}
            </div>

            <div className="filter-sections">
                {/* Indices Section */}
                <div className="filter-section">
                    <h4 className="filter-section-title">Indices</h4>
                    <div className="filter-chips">
                        {Object.entries(INDEX_LABELS).map(([key, label]) => (
                            <button
                                key={key}
                                className={`filter-chip ${selectedIndices[0] === key ? 'active' : ''}`}
                                onClick={() => selectIndex(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sectors Section removed as per request */}
            </div>
        </div>
    );
};

export default FilterBar;
