import 'styles/index.scss';
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary} from 'react-error-boundary';
import {Logger} from 'utils';
import {createErrorReport} from 'services/reporting';
import App from 'components/App';
import BSOD from 'components/Errors/BSOD';
import {MOBILE_BREAKPOINT} from 'services/layout/breakpoints';
import './registerServiceWorker';

Logger.createErrorReport = createErrorReport;

const uncaught = new Logger('uncaught');

window.onerror = __dev__ ? uncaught.error : uncaught.warn;

// Set responsive classes synchronously before first paint to avoid a layout flash.
const appElement = document.getElementById('app')!;
if (matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 0.02}px)`).matches) {
    document.documentElement.classList.add('mobile');
    appElement.classList.add('mobile');
}
if (matchMedia('(hover: none) and (pointer: coarse)').matches) {
    document.documentElement.classList.add('touch');
    appElement.classList.add('touch');
}

createRoot(appElement).render(
    <StrictMode>
        <ErrorBoundary FallbackComponent={BSOD}>
            <App />
        </ErrorBoundary>
    </StrictMode>
);
