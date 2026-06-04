import React, {useCallback, useState} from 'react';
import {showDialog} from 'components/Dialog';
import {SettingsDialog} from 'components/Settings';
import {IconButton} from 'components/Button';
import MediaSources, {MediaSourceView} from 'components/MediaSources';

// Library tab: reuses <MediaSources/> (the service/source tree + first-run StartupWizard)
// and drills down into the selected source's ready-made <MediaBrowser/> (source.view).
// Both panes stay mounted (display toggled) to preserve tree expansion and pager state.
export default function MobileLibraryTab() {
    const [source, setSource] = useState<MediaSourceView | null>(null);
    const [showBrowser, setShowBrowser] = useState(false);

    const handleSelect = useCallback((source: MediaSourceView | null) => {
        setSource(source);
        if (source) {
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
                <div className="mobile-library-pane" hidden={showBrowser}>
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
