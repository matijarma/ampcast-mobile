import {useEffect} from 'react';
import {fromEvent, Subscription} from 'rxjs';
import {MOBILE_BREAKPOINT} from 'services/layout/breakpoints';

// Toggles `.mobile` (narrow viewport) and `.touch` (coarse pointer) classes on
// <html> and #app, mirroring the `usePseudoClasses` pattern. SCSS keys responsive
// rules off these classes:
//   - `.mobile` (width)   -> layout/shell changes
//   - `.touch` (pointer)  -> tap-target sizing, touch ergonomics (orthogonal to width)
// The classes are also set synchronously in `index.tsx` before first paint to
// avoid a flash; this hook keeps them in sync as the environment changes.
export default function useResponsiveClasses(): void {
    useEffect(() => {
        const html = document.documentElement;
        const app = document.getElementById('app')!;
        const mqMobile = matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 0.02}px)`);
        const mqTouch = matchMedia('(hover: none) and (pointer: coarse)');
        const apply = () => {
            const mobile = mqMobile.matches;
            const touch = mqTouch.matches;
            html.classList.toggle('mobile', mobile);
            app.classList.toggle('mobile', mobile);
            html.classList.toggle('touch', touch);
            app.classList.toggle('touch', touch);
        };
        const subscription = new Subscription();
        subscription.add(fromEvent(mqMobile, 'change').subscribe(apply));
        subscription.add(fromEvent(mqTouch, 'change').subscribe(apply));
        apply();
        return () => subscription.unsubscribe();
    }, []);
}
