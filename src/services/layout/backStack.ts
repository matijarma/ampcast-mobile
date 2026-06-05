import {isMiniPlayer} from 'utils';
import {isMobileLayout, observeLayoutMode} from './layoutMode';

// Hardware/browser Back handling for the mobile layout.
//
// Strategy: a single sentinel history entry (`history.pushState`) acts as a trap for the
// Back button, paired with a LIFO registry of close functions. Pressing Back consumes
// the sentinel (firing `popstate`); the top layer (menu → dialog → Now Playing → drilled
// view) is closed and the sentinel is re-pushed — so Back always has exactly one of our
// entries to consume and the page's real history never grows. With no layers open, Back
// returns to the Library tab; at the Library root it asks for confirmation ("Press back
// again to exit") before actually leaving. Desktop history is never touched: the trap
// only arms in the mobile layout, and is dismantled when the layout switches to desktop.

interface BackEntry {
    close: () => void;
}

interface RootHandlers {
    getActiveTab: () => string;
    goLibrary: () => void;
}

const SENTINEL = {ampcastBack: true};
const EXIT_TIMEOUT = 2_500; // ms; matches the Android double-back convention

const entries: BackEntry[] = [];
let rootHandlers: RootHandlers | null = null;
let armed = false;
let suppressNextPopstate = false;
let exitArmed = false;
let exitTimer = 0;

// Register a close function for the currently-topmost dismissable layer. Returns an
// unregister function (idempotent, identity-based — safe under StrictMode re-runs).
// Calling this off-mobile just records the entry (so it works after a resize to
// mobile); the history trap itself only arms in the mobile layout.
export function registerBackHandler(close: () => void): () => void {
    const entry: BackEntry = {close};
    entries.push(entry);
    arm();
    return () => {
        const index = entries.indexOf(entry);
        if (index !== -1) {
            entries.splice(index, 1);
        }
    };
}

// Wired up by the mobile shell (MobileApp): Back with no layers open falls back to
// tab navigation (non-library tab → Library) and then to the exit confirmation.
export function setBackRootHandlers(handlers: RootHandlers | null): void {
    rootHandlers = handlers;
    if (handlers) {
        arm();
    }
}

function arm(): void {
    if (armed || !isMobileLayout() || isMiniPlayer) {
        return;
    }
    // Our sentinel re-uses the current scroll position; never restore.
    history.scrollRestoration = 'manual';
    history.pushState(SENTINEL, '');
    armed = true;
}

// Push the sentinel back BEFORE running any close function, so a Back press arriving
// mid-close still has a sentinel to consume (race-safe).
function rearm(): void {
    history.pushState(SENTINEL, '');
}

// Mobile → desktop: consume our sentinel so desktop history is pristine.
function disarm(): void {
    resetExit();
    if (armed) {
        armed = false;
        suppressNextPopstate = true;
        history.back();
    }
}

function handlePopstate(): void {
    if (suppressNextPopstate) {
        suppressNextPopstate = false;
        return;
    }
    if (!armed) {
        return;
    }
    // Our sentinel has just been consumed by this Back press.
    resetExitTimer();
    const entry = entries.pop();
    if (entry) {
        rearm();
        entry.close();
        return;
    }
    if (rootHandlers && rootHandlers.getActiveTab() !== 'library') {
        rearm();
        rootHandlers.goLibrary();
    } else if (exitArmed) {
        // Second Back within the timeout: actually leave. In a browser tab this exits
        // to the previous page; a freshly-launched (P)WA has no previous entry, so the
        // `history.back()` no-ops and the *next* (OS-level) Back closes the app —
        // either way the trap is gone and exiting is now native.
        resetExit();
        armed = false;
        history.back();
    } else {
        rearm();
        exitArmed = true;
        showToast('Press back again to exit');
        exitTimer = self.setTimeout(resetExit, EXIT_TIMEOUT);
    }
}

function resetExitTimer(): void {
    if (exitTimer) {
        self.clearTimeout(exitTimer);
        exitTimer = 0;
    }
}

function resetExit(): void {
    resetExitTimer();
    exitArmed = false;
    hideToast();
}

// ---- Exit confirmation toast (no toast system exists; a plain DOM pill) -----------

let toast: HTMLElement | null = null;

function showToast(message: string): void {
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'back-exit-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        (document.getElementById('system') || document.body).appendChild(toast);
    }
    toast.textContent = message;
    // Force a style flush so the transition runs even on same-frame show.
    toast.getBoundingClientRect();
    toast.classList.add('visible');
}

function hideToast(): void {
    toast?.classList.remove('visible');
}

// ---- Initialisation ----------------------------------------------------------------

window.addEventListener('popstate', handlePopstate);

// Reload adoption: a reload keeps the sentinel as the current history entry. Adopt it
// when still mobile (no extra push needed); consume it when now desktop.
if ((history.state as typeof SENTINEL | null)?.ampcastBack) {
    if (isMobileLayout() && !isMiniPlayer) {
        history.scrollRestoration = 'manual';
        armed = true;
    } else {
        suppressNextPopstate = true;
        history.back();
    }
}

observeLayoutMode().subscribe((mode) => {
    if (mode === 'desktop') {
        disarm();
    } else if (entries.length || rootHandlers) {
        // Resized to mobile with layers already open (or the shell mounted): re-trap.
        arm();
    }
});
