import { useEffect } from 'react';

interface UseManualBlockerOptions {
    when: boolean;
    onBlock: (target?: string) => void;
}

/**
 * A manual navigation blocker for React Router v6/v7 when using <BrowserRouter>.
 * It intercepts:
 * 1. Window close/refresh (beforeunload)
 * 2. Browser Back/Forward buttons (popstate)
 * 3. Global clicks on links (capture-phase click listener)
 */
export const useManualBlocker = ({ when, onBlock }: UseManualBlockerOptions) => {

    // 1. Handle Window Close/Refresh
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (when) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [when]);

    // 2. Handle Browser Back/Forward (popstate)
    useEffect(() => {
        if (!when) return;

        const handlePopState = (_e: PopStateEvent) => {
            // Revert the navigation by pushing the current state back
            window.history.pushState(null, '', window.location.pathname);
            onBlock();
        };

        window.addEventListener('popstate', handlePopState);
        // Push an extra entry to catch the next popstate
        window.history.pushState(null, '', window.location.pathname);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [when, onBlock]);

    // 3. Handle Global Click Interception (Sidebar etc)
    useEffect(() => {
        if (!when) return;

        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');

            if (anchor && anchor.href && !anchor.target) {
                const url = new URL(anchor.href);
                // Only intercept internal links (same origin)
                if (url.origin === window.location.origin) {
                    const nextPath = url.pathname + url.search + url.hash;
                    
                    // If it's a different path, block it
                    if (nextPath !== window.location.pathname + window.location.search + window.location.hash) {
                        e.preventDefault();
                        e.stopPropagation();
                        onBlock(nextPath);
                    }
                }
            }
        };

        // Use capture phase to intercept before React Router's own listeners
        document.addEventListener('click', handleGlobalClick, true);
        return () => document.removeEventListener('click', handleGlobalClick, true);
    }, [when, onBlock]);

    return null;
};
