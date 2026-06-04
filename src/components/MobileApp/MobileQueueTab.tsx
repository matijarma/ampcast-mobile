import React, {useRef} from 'react';
import {eject, loadAndPlay} from 'services/mediaPlayback';
import {ListViewHandle} from 'components/ListView';
import Playlist from 'components/Playlist';

// Queue tab: the canonical play queue. Reuses <Playlist/> verbatim (it subscribes to
// the shared playlist service and renders the same ListView as the desktop).
export default function MobileQueueTab() {
    const playlistRef = useRef<ListViewHandle>(null);

    return (
        <div className="mobile-screen mobile-queue-tab">
            <header className="mobile-screen-header">
                <h1 className="mobile-screen-title">Queue</h1>
            </header>
            <div className="mobile-screen-body">
                <div className="panel">
                    <Playlist onPlay={loadAndPlay} onEject={eject} ref={playlistRef} />
                </div>
            </div>
        </div>
    );
}
