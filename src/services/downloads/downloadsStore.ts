import type {Observable} from 'rxjs';
import {BehaviorSubject, filter, fromEvent, map} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import MediaItem from 'types/MediaItem';

// Local storage for downloaded music. Metadata and audio are kept in separate tables so
// that the live metadata query never loads the (large) audio blobs into memory.

export interface DownloadedItem {
    readonly src: string; // primary key (e.g. 'jellyfin:audio:{id}')
    readonly item: MediaItem; // metadata snapshot (no blobs / transient fields)
    readonly size: number; // audio size in bytes
    readonly addedAt: number; // unix time (seconds)
}

interface DownloadedFile {
    readonly src: string;
    readonly blob: Blob;
}

const UNINITIALIZED: DownloadedItem[] = [];
const downloads$ = new BehaviorSubject<readonly DownloadedItem[]>(UNINITIALIZED);
const downloadedSrcs = new Set<string>();

class DownloadsStore extends Dexie {
    readonly items!: Dexie.Table<DownloadedItem, string>;
    readonly files!: Dexie.Table<DownloadedFile, string>;

    constructor() {
        super('ampcast/downloads');

        this.version(1).stores({
            items: '&src, addedAt',
            files: '&src',
        });

        const subscription = liveQuery(() =>
            this.items.orderBy('addedAt').reverse().toArray()
        ).subscribe((items) => {
            downloadedSrcs.clear();
            for (const download of items) {
                downloadedSrcs.add(download.src);
            }
            downloads$.next(items);
        });

        fromEvent(window, 'pagehide').subscribe(() => subscription.unsubscribe());
    }
}

const store = new DownloadsStore();

export default store;

export function observeDownloads(): Observable<readonly DownloadedItem[]> {
    return downloads$.pipe(filter((items) => items !== UNINITIALIZED));
}

export function observeDownloadedItems(): Observable<readonly MediaItem[]> {
    return observeDownloads().pipe(
        map((downloads) => downloads.map((download) => download.item))
    );
}

export function isDownloaded(src: string): boolean {
    return downloadedSrcs.has(src);
}

export async function getDownloadedBlob(src: string): Promise<Blob | undefined> {
    if (!downloadedSrcs.has(src) && downloads$.value !== UNINITIALIZED) {
        return undefined; // fast path: definitely not downloaded
    }
    const file = await store.files.get(src);
    return file?.blob;
}

export function getDownloadsSize(): number {
    const downloads = downloads$.value;
    return downloads === UNINITIALIZED
        ? 0
        : downloads.reduce((total, download) => total + (download.size || 0), 0);
}

export async function addDownload(item: MediaItem, blob: Blob): Promise<void> {
    const src = item.src;
    const addedAt = Math.floor(Date.now() / 1000);
    await store.transaction('rw', store.items, store.files, async () => {
        await store.files.put({src, blob});
        await store.items.put({src, item, size: blob.size, addedAt});
    });
}

export async function removeDownload(src: string): Promise<void> {
    await store.transaction('rw', store.items, store.files, async () => {
        await store.files.delete(src);
        await store.items.delete(src);
    });
}
