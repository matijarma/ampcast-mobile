import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import ObservablePager from 'services/pagers/ObservablePager';
import {observeDownloadedItems} from './downloadsStore';

export const downloadedTracks: MediaSource<MediaItem> = {
    id: 'downloads/tracks',
    title: 'Downloaded',
    icon: 'downloads',
    itemType: ItemType.Media,
    primaryItems: {
        layout: {
            view: 'card',
            card: {
                h1: 'IconTitle',
                h2: 'Artist',
                h3: 'AlbumAndYear',
                data: 'Duration',
            },
            details: ['IconTitle', 'Artist', 'Album', 'Duration'],
            views: [],
        },
        itemKey: 'src',
        emptyMessage: 'No downloaded music',
    },

    search(): Pager<MediaItem> {
        return new ObservablePager(observeDownloadedItems(), {passive: true});
    },
};
