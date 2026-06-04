import React, {useCallback} from 'react';
import mediaPlayback, {pause, play} from 'services/mediaPlayback';
import {stopPropagation} from 'utils';
import CoverArt from 'components/CoverArt';
import {IconButton} from 'components/Button';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';
import './MiniPlayerBar.scss';

export interface MiniPlayerBarProps {
    onExpand: () => void;
}

// Persistent now-playing strip above the tab bar. Tapping the bar expands the Now
// Playing sheet; the transport buttons act in place. Reads current track + paused
// state from existing observables; no new state.
export default function MiniPlayerBar({onExpand}: MiniPlayerBarProps) {
    const item = useCurrentlyPlaying();
    const paused = usePaused();

    const handlePlayPause = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            if (paused) {
                play();
            } else {
                pause();
            }
        },
        [paused]
    );

    const handleNext = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        mediaPlayback.next();
    }, []);

    if (!item) {
        return null;
    }

    const artist = item.artists?.join(', ');

    return (
        <div className="mini-player-bar">
            <button type="button" className="mini-player-info" onClick={onExpand} title="Now playing">
                <CoverArt className="mini-player-art" item={item} size={96} />
                <span className="mini-player-text">
                    <span className="mini-player-title">{item.title}</span>
                    {artist ? <span className="mini-player-artist">{artist}</span> : null}
                </span>
            </button>
            <div className="mini-player-controls" onMouseDown={stopPropagation}>
                <IconButton
                    icon={paused ? 'play' : 'pause'}
                    title={paused ? 'Play' : 'Pause'}
                    onClick={handlePlayPause}
                />
                <IconButton icon="next" title="Next track" onClick={handleNext} />
            </div>
        </div>
    );
}
