import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to top on every route change.
 * Also scrolls to top when the user returns to the tab after extended idle.
 */
const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export default function ScrollToTop() {
    const { pathname } = useLocation();

    // Scroll on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    // Scroll on returning from idle
    useEffect(() => {
        let hiddenAt = null;

        const handleVisibility = () => {
            if (document.hidden) {
                hiddenAt = Date.now();
            } else if (hiddenAt && Date.now() - hiddenAt > IDLE_THRESHOLD) {
                window.scrollTo(0, 0);
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    return null;
}
