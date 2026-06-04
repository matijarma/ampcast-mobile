import React from 'react';
import {ListViewHandle} from 'components/ListView';
import {IconButtons} from 'components/Button';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePlaybackState from 'hooks/usePlaybackState';
import MediaButtons from './MediaButtons';
import PlaylistMenuButton from './PlaylistMenuButton';
import RadioButtons from './RadioButtons';
import TimeControl from './TimeControl';
import VolumeControl from './VolumeControl';
import './MediaControls.scss';
import './MediaControls-overlay.scss';

export interface MediaControlsProps {
    overlay?: boolean;
    compact?: boolean;
    playlistRef?: React.RefObject<ListViewHandle | null>;
}

export default function MediaControls({overlay, compact, playlistRef}: MediaControlsProps) {
    const currentlyPlaying = useCurrentlyPlaying();
    const {paused} = usePlaybackState();

    return (
        <div className={`media-controls${overlay ? '-overlay' : ''}${compact ? ' compact' : ''}`}>
            <TimeControl overlay={overlay} />
            <div className="playback-control">
                <VolumeControl overlay={overlay} />
                {overlay ? (
                    <>
                        <IconButtons className="media-buttons">
                            <MediaButtons overlay={overlay} />
                        </IconButtons>
                        {currentlyPlaying?.skippable && !paused ? (
                            <IconButtons className="radio-buttons">
                                <RadioButtons overlay />
                            </IconButtons>
                        ) : null}
                    </>
                ) : (
                    <div className="media-buttons">
                        <MediaButtons overlay={overlay} playlistRef={playlistRef} />
                    </div>
                )}
                {!overlay && !compact && playlistRef ? (
                    <PlaylistMenuButton playlistRef={playlistRef} />
                ) : null}
            </div>
        </div>
    );
}
