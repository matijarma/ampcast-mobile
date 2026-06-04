import useMediaQuery from './useMediaQuery';

export type PointerType = 'coarse' | 'fine';

// Reactive coarse/fine pointer detection. Drives touch ergonomics (large tap
// targets, long-press menus, action sheets) independently of the layout width,
// so a touch laptop gets touch affordances and a narrow desktop window does not.
export default function usePointerType(): PointerType {
    const coarse = useMediaQuery('(hover: none) and (pointer: coarse)');
    return coarse ? 'coarse' : 'fine';
}
