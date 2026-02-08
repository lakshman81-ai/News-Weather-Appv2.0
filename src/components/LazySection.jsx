import React, { useEffect } from 'react';
import useIntersectionObserver from '../hooks/useIntersectionObserver';

const LazySection = ({ children, onVisible, isLoaded, placeholderHeight = '200px' }) => {
    const [ref, entry] = useIntersectionObserver({
        threshold: 0.1,
        rootMargin: '200px', // Trigger 200px before element is visible
        freezeOnceVisible: true
    });

    useEffect(() => {
        if (entry?.isIntersecting && onVisible) {
            onVisible();
        }
    }, [entry, onVisible]);

    // Case 1: Already loaded - render children immediately
    if (isLoaded) {
        return <div>{children}</div>;
    }

    // Case 2: Not loaded yet
    return (
        <div ref={ref} style={{ minHeight: placeholderHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}>
            {entry?.isIntersecting ? (
                <div className="loading-state" style={{ opacity: 0.6 }}>
                    <div className="loading-spinner" style={{
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTop: '3px solid var(--accent-primary)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading section...</span>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            ) : null}
        </div>
    );
};

export default LazySection;
