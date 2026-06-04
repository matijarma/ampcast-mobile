import React from 'react';
import {isMiniPlayer} from 'utils';
import MiniPlayer from 'components/MiniPlayer';
import MobileApp from 'components/MobileApp';
import MediaLibrary from 'components/MediaLibrary';
import MediaPlayback from 'components/MediaPlayback';
import Splitter from 'components/Splitter';
import useAppSettings from './useAppSettings';
import useAppUpdated from './useAppUpdated';
import useBrowser from './useBrowser';
import useConnectivity from './useConnectivity';
import usePseudoClasses from './usePseudoClasses';
import usePreload from './usePreload';
import usePreventDrop from './usePreventDrop';
import useMediaSession from './useMediaSession';
import useGlobalActions from './useGlobalActions';
import useResponsiveClasses from './useResponsiveClasses';
import useIsMobile from 'hooks/useIsMobile';

export default function AppContent() {
    useAppSettings();
    useBrowser();
    useConnectivity();
    usePseudoClasses();
    useResponsiveClasses();
    usePreload();
    usePreventDrop();
    useMediaSession();
    useGlobalActions();
    useAppUpdated();

    const isMobile = useIsMobile();

    if (isMiniPlayer) {
        return <MiniPlayer />;
    }

    if (isMobile) {
        return <MobileApp />;
    }

    return (
        <Splitter id="app-layout" arrange="columns">
            <MediaLibrary />
            <MediaPlayback />
        </Splitter>
    );
}
