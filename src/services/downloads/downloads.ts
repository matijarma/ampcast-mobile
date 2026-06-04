import type {Observable} from 'rxjs';
import {BehaviorSubject, combineLatest, filter, firstValueFrom, map, race, Subscription, timer} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import Pager from 'types/Pager';
import {exists, LiteStorage, Logger} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
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

const downloadableTypes = [ItemType.Media, ItemType.Album, ItemType.Playlist];

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
            return fetchAllItems((item as MediaAlbum | MediaPlaylist).pager);

        default:
            return [];
    }
}

// Drive a pager until every item has loaded (albums/playlists are bounded in size).
async function fetchAllItems(pager: Pager<MediaItem>): Promise<readonly MediaItem[]> {
    const subscription = new Subscription();
    try {
        subscription.add(
            pager.observeItems().subscribe((items) => pager.fetchAt(items.length))
        );
        pager.fetchAt(0);
        return await firstValueFrom(
            race(
                combineLatest([pager.observeItems(), pager.observeSize()]).pipe(
                    filter(([items, size]) => items.length >= size && items.every(exists)),
                    map(([items]) => items)
                ),
                timer(60_000).pipe(
                    map((): readonly MediaItem[] => {
                        throw Error('Timed out fetching items');
                    })
                )
            )
        );
    } finally {
        subscription.unsubscribe();
    }
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
