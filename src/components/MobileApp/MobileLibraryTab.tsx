import React, {useCallback, useRef, useState} from 'react';
import {showDialog} from 'components/Dialog';
import {SettingsDialog} from 'components/Settings';
import {IconButton} from 'components/Button';
import MediaSources, {MediaSourceView} from 'components/MediaSources';

// Library tab: reuses <MediaSources/> (the service/source tree + first-run StartupWizard)
// and drills down into the selected source's ready-made <MediaBrowser/> (source.view).
// Both panes stay mounted (display toggled) to preserve tree expansion and pager state.
//
// The tab always STARTS at the tree: TreeView restores its persisted selection on mount
// (firing onSelect), and auto-drilling into that source is wrong on mobile — especially
// offline, where the restored remote view may be unreachable while local sources
// (e.g. Downloads) remain usable. Drilling only happens on a real user tap.
export default function MobileLibraryTab() {
    const [source, setSource] = useState<MediaSourceView | null>(null);
    const [showBrowser, setShowBrowser] = useState(false);
    const sourceRef = useRef<MediaSourceView | null>(null);
    const interactedRef = useRef(false);

    const handleSelect = useCallback((source: MediaSourceView | null) => {
        sourceRef.current = source;
        setSource(source);
        if (source && interactedRef.current) {
            setShowBrowser(true);
        }
    }, []);

    const handleTreePointerDown = useCallback(() => {
        interactedRef.current = true;
    }, []);

    const handleTreeClick = useCallback((event: React.MouseEvent) => {
        // Selection doesn't change when the already-selected node is tapped (so no
        // onSelect fires) — still drill in when a selected row is tapped.
        const row = (event.target as HTMLElement).closest('.tree-view-row');
        if (row?.classList.contains('selected-text') && sourceRef.current) {
            setShowBrowser(true);
        }
    }, []);

    const back = useCallback(() => setShowBrowser(false), []);

    const openSettings = useCallback(() => {
        showDialog(SettingsDialog, true);
    }, []);

    return (
        <div className="mobile-screen mobile-library-tab">
            <header className="mobile-screen-header">
                {showBrowser ? (
                    <IconButton
                        icon="left"
                        className="mobile-back"
                        title="Back"
                        onClick={back}
                    />
                ) : (
                    <h1 className="mobile-screen-title">Library</h1>
                )}
                {showBrowser ? null : (
                    <IconButton icon="settings" title="Settings" onClick={openSettings} />
                )}
            </header>
            <div className="mobile-screen-body">
                <div
                    className="mobile-library-pane"
                    hidden={showBrowser}
                    onPointerDown={handleTreePointerDown}
                    onClick={handleTreeClick}
                >
                    <MediaSources onSelect={handleSelect} />
                </div>
                {source ? (
                    <div className="mobile-library-pane" hidden={!showBrowser}>
                        {source.view}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
