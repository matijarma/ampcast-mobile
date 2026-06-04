import React, {useCallback} from 'react';
import MobileTabBar from './MobileTabBar/MobileTabBar';
import MiniPlayerBar from './MiniPlayerBar/MiniPlayerBar';
import NowPlayingScreen from './NowPlayingScreen/NowPlayingScreen';
import MobileLibraryTab from './MobileLibraryTab';
import MobileSearchTab from './MobileSearchTab';
import MobileQueueTab from './MobileQueueTab';
import useMobileNav from './useMobileNav';
import './MobileApp.scss';

// Top-level mobile shell (rendered by AppContent when the viewport is narrow). Lays out,
// top to bottom: the active tab panel, the persistent MiniPlayerBar, the bottom tab bar;
// NowPlayingScreen overlays as an always-mounted slide-up sheet. All three tab panels stay
// mounted (hidden when inactive) so scroll position and pager state survive tab switches.
export default function MobileApp() {
    const {
        activeTab,
        setActiveTab,
        nowPlayingExpanded,
        expandNowPlaying,
        collapseNowPlaying,
    } = useMobileNav();

    const viewQueue = useCallback(() => {
        collapseNowPlaying();
        setActiveTab('queue');
    }, [collapseNowPlaying, setActiveTab]);

    return (
        <div className="mobile-app">
            <div className="mobile-app-content">
                <div className="mobile-tab-panel" hidden={activeTab !== 'library'}>
                    <MobileLibraryTab />
                </div>
                <div className="mobile-tab-panel" hidden={activeTab !== 'search'}>
                    <MobileSearchTab />
                </div>
                <div className="mobile-tab-panel" hidden={activeTab !== 'queue'}>
                    <MobileQueueTab />
                </div>
            </div>
            <MiniPlayerBar onExpand={expandNowPlaying} />
            <MobileTabBar activeTab={activeTab} onSelect={setActiveTab} />
            <NowPlayingScreen
                expanded={nowPlayingExpanded}
                onCollapse={collapseNowPlaying}
                onViewQueue={viewQueue}
            />
        </div>
    );
}
