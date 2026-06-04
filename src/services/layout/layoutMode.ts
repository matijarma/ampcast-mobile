import {BehaviorSubject, distinctUntilChanged, Observable} from 'rxjs';
import {MOBILE_BREAKPOINT} from './breakpoints';

// Reactive source of truth for the layout mode, driven by the viewport width.
// This is intentionally width-driven (not user-agent driven) so that resizing a
// desktop window, rotating a device, or using devtools device emulation all work.
// Touch *capability* is a separate, orthogonal signal (see `usePointerType`).

export type LayoutMode = 'mobile' | 'desktop';

const mql = matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 0.02}px)`);
const layoutMode$ = new BehaviorSubject<LayoutMode>(mql.matches ? 'mobile' : 'desktop');

mql.addEventListener('change', (event) => {
    layoutMode$.next(event.matches ? 'mobile' : 'desktop');
});

export function observeLayoutMode(): Observable<LayoutMode> {
    return layoutMode$.pipe(distinctUntilChanged());
}

export function getLayoutMode(): LayoutMode {
    return layoutMode$.value;
}

export function isMobileLayout(): boolean {
    return layoutMode$.value === 'mobile';
}
