import React from 'react';
import Media from 'components/Media';
import MediaControls from 'components/MediaControls';
import {IconButton} from 'components/Button';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import './NowPlayingScreen.scss';

export interface NowPlayingScreenProps {
    expanded: boolean;
    onCollapse: () => void;
    onViewQueue: () => void;
}

// The full Now Playing experience. ALWAYS mounted (translated off-screen when
// collapsed) so it hosts the single <Media/> instance — the audio/video players live
// here and survive tab/sheet changes. Reuses <Media/> (visualizer/art) and the full
// <MediaControls compact/> transport.
export default function NowPlayingScreen({expanded, onCollapse, onViewQueue}: NowPlayingScreenProps) {
    const item = useCurrentlyPlaying();
    const artist = item?.artists?.join(', ');

    return (
        <div
            className={`now-playing-screen ${expanded ? 'expanded' : ''}`}
            aria-hidden={!expanded}
        >
            <header className="now-playing-header">
                <IconButton
                    icon="left"
                    className="now-playing-collapse"
                    title="Collapse"
                    onClick={onCollapse}
                />
            </header>
            <div className="now-playing-media">
                <Media />
            </div>
            <div className="now-playing-info">
                <h1 className="now-playing-title">{item?.title || ''}</h1>
                {artist ? <p className="now-playing-artist">{artist}</p> : null}
            </div>
            <div className="now-playing-transport">
                <MediaControls compact />
            </div>
            <button type="button" className="now-playing-queue-button" onClick={onViewQueue}>
                Up next
            </button>
        </div>
    );
}
