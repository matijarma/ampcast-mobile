import type {Observable} from 'rxjs';
import {BehaviorSubject, combineLatest, filter, map, race, take, timer} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {LiteStorage, Logger} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import fetchAllTracks from 'services/pagers/fetchAllTracks';
import {
    addDownload,
    getDownloadsSize,
    isDownloaded,
    removeDownload as deleteDownload,
} from './downloadsStore';

// Download manager: fetches the original media files for tracks/albums/playlists and
// stores them locally (see downloadsStore). Downloaded items play from local storage
// (see mediaPlayback.getPlayableItem), which also makes them available offline.

const logger = new Logger('downloads');

const storage = new LiteStorage('downloads');

const downloadableTypes = [ItemType.Media, ItemType.Album, ItemType.Playlist, ItemType.Folder];

const pendingCount$ = new BehaviorSubject(0);

export function observePendingDownloadCount(): Observable<number> {
    return pendingCount$;
}

// Storage budget for downloaded music (default 2 GB). Keeps the app's storage usage
// sane while still allowing a usable amount of offline music. Stored as GB.
export function getMaxSize(): number {
    return storage.getNumber('maxSizeGB', 2) * 1_000_000_000;
}

export function setMaxSizeGB(maxSizeGB: number): void {
    storage.setNumber('maxSizeGB', maxSizeGB);
}

export function canDownload(item: MediaObject): boolean {
    if (!downloadableTypes.includes(item.itemType)) {
        return false;
    }
    const service = getServiceFromSrc(item);
    return !!service?.getDownloadUrl && service.isLoggedIn();
}

export async function download(item: MediaObject): Promise<void> {
    pendingCount$.next(pendingCount$.value + 1);
    try {
        await requestPersistentStorage();
        const tracks = await getTracks(item);
        for (const track of tracks) {
            if (!isDownloaded(track.src)) {
                await downloadTrack(track);
            }
        }
    } finally {
        pendingCount$.next(pendingCount$.value - 1);
    }
}

export async function removeDownload(item: MediaObject): Promise<void> {
    if (item.itemType === ItemType.Media) {
        await deleteDownload(item.src);
    }
}

async function downloadTrack(item: MediaItem): Promise<void> {
    const service = getServiceFromSrc(item);
    if (!service?.getDownloadUrl) {
        throw Error('Download not supported');
    }
    const url = service.getDownloadUrl(item);
    const response = await fetch(url);
    if (!response.ok) {
        throw response;
    }
    const blob = await response.blob();
    if (getDownloadsSize() + blob.size > getMaxSize()) {
        throw Error(
            `Download storage is full (${formatSize(getMaxSize())} maximum). Remove some downloads first.`
        );
    }
    await addDownload(sanitize(item), blob);
    logger.info('Downloaded:', item.src, formatSize(blob.size));
}

async function getTracks(item: MediaObject): Promise<readonly MediaItem[]> {
    switch (item.itemType) {
        case ItemType.Media:
            return [item];

        case ItemType.Album:
        case ItemType.Playlist:
            return fetchAllTracks(item as MediaAlbum | MediaPlaylist);

        case ItemType.Folder: {
            // Just the audio files directly inside the folder (not recursive).
            const items = await fetchFolderItems(item as MediaFolder);
            return items.filter(
                (item): item is Exclude<MediaFolderItem, MediaFolder> =>
                    item.itemType === ItemType.Media
            );
        }

        default:
            return [];
    }
}

// Same approach as `fetchAllTracks`, but folders have no `trackCount` to use as the
// fetch limit (and their pager also yields subfolders and the '../' navigation item).
function fetchFolderItems(folder: MediaFolder): Promise<readonly MediaFolderItem[]> {
    return new Promise((resolve, reject) => {
        const pager = folder.pager;
        const limit = 1000;
        const items$ = combineLatest([pager.observeItems(), pager.observeSize()]).pipe(
            filter(
                ([items, size]) => items.reduce((total) => (total += 1), 0) >= Math.min(size, limit)
            ),
            map(([items]) => items),
            take(1)
        );
        const error$ = race(
            pager
                .observeError()
                .pipe(
                    map((error: any) =>
                        error instanceof Error ? error : Error(error?.message || 'unknown')
                    )
                ),
            timer(10_000).pipe(map(() => Error('Timed out fetching folder items')))
        );
        race(items$, error$).subscribe((result) => {
            if (result instanceof Error) {
                reject(result);
            } else {
                resolve(result);
            }
        });
        pager.fetchAt(0, limit);
    });
}

// Strip transient/blob fields before persisting the metadata snapshot.
function sanitize(item: MediaItem): MediaItem {
    const sanitized: Record<string, unknown> = {...item};
    delete sanitized.blob;
    delete sanitized.blobUrl;
    delete sanitized.playbackType;
    return sanitized as unknown as MediaItem;
}

async function requestPersistentStorage(): Promise<void> {
    try {
        if (!storage.getBoolean('persisted') && navigator.storage?.persist) {
            const persisted = await navigator.storage.persist();
            storage.setBoolean('persisted', persisted);
        }
    } catch (err) {
        logger.error(err);
    }
}

function formatSize(size: number): string {
    return size >= 1_000_000_000
        ? `${(size / 1_000_000_000).toFixed(1)} GB`
        : `${Math.round(size / 1_000_000)} MB`;
}
