import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design
 * Returns breakpoint information
 */
export function useMediaQuery() {
    // Initialize with safe defaults for SSR/initial render
    const [isDesktop, setIsDesktop] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isWebView, setIsWebView] = useState(false);
    const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

    useEffect(() => {
        // Function to update state based on window width
        const handleResize = () => {
            const width = window.innerWidth;
            setScreenWidth(width);
            const desktop = width >= 1024;
            const tablet = width >= 768 && width < 1024;

            setIsDesktop(desktop);
            setIsTablet(tablet);
            // We define "WebView" or "Desktop View" as effectively the same for this layout 
            // context - meaning a large screen that supports the sidebar layout.
            setIsWebView(desktop);

            console.log(`[Layout] Width: ${width}px, Mode: ${desktop ? 'desktop' : tablet ? 'tablet' : 'mobile'}`);
        };

        // Set initial values
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return { isDesktop, isTablet, isWebView, screenWidth };
}
