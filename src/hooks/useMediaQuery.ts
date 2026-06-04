import {useEffect, useState} from 'react';

// Generic reactive `matchMedia` hook. Re-renders when the query result changes
// (resize, orientation, devtools emulation, plugging in a mouse, etc.).
export default function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => matchMedia(query).matches);

    useEffect(() => {
        const mql = matchMedia(query);
        const handler = () => setMatches(mql.matches);
        mql.addEventListener('change', handler);
        handler(); // resync in case the value changed between render and effect
        return () => mql.removeEventListener('change', handler);
    }, [query]);

    return matches;
}
