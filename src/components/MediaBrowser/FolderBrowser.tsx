import React, {useCallback, useEffect, useRef, useState} from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import {performAction, showActionsMenu} from 'components/Actions';
import FolderItemList from 'components/MediaList/FolderItemList';
import PageHeader from './PageHeader';

export interface FolderBrowserProps {
    service: MediaService;
    source: MediaSource<MediaFolderItem>;
}

export default function FolderBrowser({service, source}: FolderBrowserProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pager, setPager] = useState<Pager<MediaFolderItem> | null>(null);
    const [path, setPath] = useState('/');

    useEffect(() => {
        const pager = source.search();
        setPager(pager);
        setPath('/');
        return () => pager.disconnect();
    }, [source]);

    const openFolder = useCallback((item: MediaFolderItem) => {
        if (item.itemType === ItemType.Folder) {
            setPager(item.pager);
            setPath(item.path || '/');
        }
    }, []);

    const handleDoubleClick = useCallback(
        async (item: MediaFolderItem) => {
            openFolder(item);
        },
        [openFolder]
    );

    const handleEnter = useCallback(
        async (items: readonly MediaFolderItem[]) => {
            if (items.length === 1) {
                openFolder(items[0]);
            }
        },
        [openFolder]
    );

    // Same as the default `MediaList` context menu, but with folder navigation
    // (`Action.Open`) handled here, where the current pager/path live.
    const handleContextMenu = useCallback(
        async (items: readonly MediaFolderItem[], x: number, y: number, button: number) => {
            if (items.length === 0) {
                return;
            }
            const action = await showActionsMenu(
                items,
                containerRef.current!,
                x,
                y,
                button === -1 ? 'right' : 'left',
                {inListView: true, source}
            );
            if (action === Action.Open) {
                openFolder(items[0]);
            } else if (action) {
                performAction(action, items);
            }
        },
        [source, openFolder]
    );

    return (
        <>
            <PageHeader icon={service.icon}>
                {service.name}: {path}
            </PageHeader>
            <div className="panel" ref={containerRef}>
                <FolderItemList
                    title={`Path: ${path}`}
                    pager={pager}
                    source={source}
                    onContextMenu={handleContextMenu}
                    onEnter={handleEnter}
                    onDoubleClick={handleDoubleClick}
                    key={path}
                />
            </div>
        </>
    );
}
