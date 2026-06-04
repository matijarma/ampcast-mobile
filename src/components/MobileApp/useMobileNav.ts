import {useCallback, useState} from 'react';
import {LiteStorage} from 'utils';

export type MobileTab = 'library' | 'search' | 'queue';

// Module-level: LiteStorage throws on duplicate id, so it must not be created per-render.
const storage = new LiteStorage('mobileNav');

export interface MobileNav {
    activeTab: MobileTab;
    setActiveTab: (tab: MobileTab) => void;
    nowPlayingExpanded: boolean;
    expandNowPlaying: () => void;
    collapseNowPlaying: () => void;
}

// Shell-local, ephemeral navigation state. Playback/queue/source state all live in
// existing RxJS services, so nothing important is duplicated here. The last active tab
// is persisted; the Now Playing sheet always starts collapsed.
export default function useMobileNav(): MobileNav {
    const [activeTab, setTab] = useState<MobileTab>(
        () => (storage.getString('activeTab') as MobileTab) || 'library'
    );
    const [nowPlayingExpanded, setExpanded] = useState(false);

    const setActiveTab = useCallback((tab: MobileTab) => {
        storage.setString('activeTab', tab);
        setTab(tab);
    }, []);

    const expandNowPlaying = useCallback(() => setExpanded(true), []);
    const collapseNowPlaying = useCallback(() => setExpanded(false), []);

    return {activeTab, setActiveTab, nowPlayingExpanded, expandNowPlaying, collapseNowPlaying};
}
