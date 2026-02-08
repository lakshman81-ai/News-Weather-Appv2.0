import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentSegmentDefinition, getTimeUntilNextSegment, SEGMENTS } from '../utils/segmentScheduler';
import { sendNotification } from '../utils/notifications';

const SegmentContext = createContext();

export function SegmentProvider({ children }) {
    const [currentSegment, setCurrentSegment] = useState(() => getCurrentSegmentDefinition());

    useEffect(() => {
        let timerId;

        const scheduleNext = () => {
            // Add a small buffer (2s) to ensure we are safely into the next minute
            const delay = getTimeUntilNextSegment() + 2000;
            console.log(`[Segment] Next switch in ${(delay / 60000).toFixed(1)} min`);

            timerId = setTimeout(() => {
                const newSeg = getCurrentSegmentDefinition();
                console.log(`[Segment] Switching to ${newSeg.label}`);
                setCurrentSegment(newSeg);

                // Trigger Notification
                sendNotification(`${newSeg.icon} ${newSeg.label}`, {
                    body: 'New content available. Tap to refresh.',
                    tag: 'segment-update',
                    renotify: true
                });

                scheduleNext(); // Schedule the next one
            }, delay);
        };

        scheduleNext();

        return () => clearTimeout(timerId);
    }, []);

    return (
        <SegmentContext.Provider value={{ currentSegment, SEGMENTS }}>
            {children}
        </SegmentContext.Provider>
    );
}

export function useSegment() {
    return useContext(SegmentContext);
}
