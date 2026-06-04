import {getLayoutMode, observeLayoutMode} from 'services/layout/layoutMode';
import useObservable from './useObservable';

// App-facing hook used at the `AppContent` branch point. True when the viewport
// is narrow enough to use the mobile shell instead of the desktop Splitter layout.
export default function useIsMobile(): boolean {
    return useObservable(observeLayoutMode, getLayoutMode()) === 'mobile';
}
