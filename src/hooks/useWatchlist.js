import { useState, useEffect } from 'react';

export function useWatchlist(storageKey = 'ua_watchlist') {
    const [watchlist, setWatchlist] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(storageKey)) || [];
        } catch {
            return [];
        }
    });

    const toggleWatchlist = (id) => {
        let newWatchlist;
        if (watchlist.includes(id)) {
            newWatchlist = watchlist.filter(itemId => itemId !== id);
        } else {
            newWatchlist = [...watchlist, id];
        }
        setWatchlist(newWatchlist);
        localStorage.setItem(storageKey, JSON.stringify(newWatchlist));
    };

    const isWatched = (id) => watchlist.includes(id);

    return { watchlist, toggleWatchlist, isWatched };
}
