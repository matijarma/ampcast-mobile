import {map} from 'rxjs';
import MiniSearch from 'minisearch';
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
    searchable: true,
    searchPlaceholder: 'Search downloads',
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

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        const items$ = observeDownloadedItems();
        if (q) {
            // In-memory search (works offline). Same approach as `localScrobbles`.
            return new ObservablePager(
                items$.pipe(map((items) => searchItems(items, q))),
                {passive: true}
            );
        } else {
            return new ObservablePager(items$, {passive: true});
        }
    },
};

function searchItems(items: readonly MediaItem[], q: string): readonly MediaItem[] {
    const itemsMap = new Map(items.map((item) => [item.src, item]));
    const fields = ['title', 'artist', 'album', 'genre'];
    const miniSearch = new MiniSearch({fields});
    miniSearch.addAll(
        [...itemsMap.values()].map((item) => ({
            id: item.src,
            title: item.title,
            artist: item.artists?.join(';') || '',
            album: item.album || '',
            genre: item.genres,
        }))
    );
    return miniSearch
        .search(q, {
            fields,
            fuzzy: 0.2,
            prefix: true,
            boost: {title: 1.05, album: 0.5, genre: 0.25},
        })
        .map((entry) => itemsMap.get(entry.id)!);
}
