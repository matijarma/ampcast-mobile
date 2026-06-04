import React from 'react';
import Icon from 'components/Icon';

// Placeholder for the dedicated Search tab. The full cross-service search surface
// (reusing SearchBar + MediaSourceSelector + the MediaBrowser `searchable` flow) is
// wired up in the per-view phase; per-service search is available in the Library tab.
export default function MobileSearchTab() {
    return (
        <div className="mobile-screen mobile-search-tab">
            <header className="mobile-screen-header">
                <h1 className="mobile-screen-title">Search</h1>
            </header>
            <div className="mobile-screen-body">
                <div className="mobile-empty-state">
                    <Icon name="search" />
                    <p>Search is coming to the mobile layout. For now, browse and search your services from the Library tab.</p>
                </div>
            </div>
        </div>
    );
}
