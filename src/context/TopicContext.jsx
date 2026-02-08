import React, { createContext, useState, useEffect, useContext } from 'react';
import {
    getSettings,
    addFollowedTopic,
    removeFollowedTopic,
    addReadArticle,
    getSuggestedTopics
} from '../utils/storage.js';
import { fetchAllTopicsNews } from '../services/topicService.js';
import { sendNotification } from '../utils/notifications.js';

const TopicContext = createContext();

export function TopicProvider({ children }) {
    const [followedTopics, setFollowedTopics] = useState([]);
    const [topicNews, setTopicNews] = useState({}); // { topicId: [articles] }
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    // Load topics from settings on mount
    useEffect(() => {
        const settings = getSettings();
        setFollowedTopics(settings.followedTopics || []);

        // Initial suggestion generation
        refreshSuggestions();
    }, []);

    // Polling Effect (every 15 minutes)
    useEffect(() => {
        if (followedTopics.length === 0) return;

        // Initial fetch logic is handled when followedTopics changes or on mount?
        // If we put refreshTopics in a useEffect dependent on followedTopics, it runs on mount (initially empty) then when populated.

        refreshTopics(false); // Initial load without notification

        const interval = setInterval(() => {
            console.log('[TopicContext] Auto-refreshing topics...');
            refreshTopics(true); // notify on updates
        }, 15 * 60 * 1000);

        return () => clearInterval(interval);
    }, [followedTopics.length]); // Re-run if topics list count changes

    const refreshTopics = async (shouldNotify = false) => {
        if (followedTopics.length === 0) return;

        // Don't set global loading true for background refreshes (shouldNotify=true)
        if (!shouldNotify) setLoading(true);

        try {
            const newsByTopic = await fetchAllTopicsNews(followedTopics);

            // Notification Logic
            if (shouldNotify) {
                checkForUpdates(newsByTopic);
            }

            setTopicNews(newsByTopic);
        } catch (error) {
            console.error('[TopicContext] Failed to refresh topics:', error);
        } finally {
            if (!shouldNotify) setLoading(false);
        }
    };

    const checkForUpdates = (newNews) => {
        let newCount = 0;
        let sampleTopic = '';

        Object.entries(newNews).forEach(([topicId, articles]) => {
            const oldArticles = topicNews[topicId] || [];
            if (articles.length > 0 && oldArticles.length > 0) {
                // Simple check: if top article ID is different
                if (articles[0].id !== oldArticles[0].id) {
                    newCount++;
                    const topic = followedTopics.find(t => t.id === topicId);
                    if (topic) sampleTopic = topic.name;
                }
            }
        });

        if (newCount > 0) {
            const title = newCount === 1
                ? `New update for ${sampleTopic}`
                : `Updates in ${newCount} followed topics`;

            sendNotification(title, {
                body: 'Click to see the latest stories.',
                tag: 'topic-update'
            });
        }
    };

    const addTopic = (topic) => {
        addFollowedTopic(topic);
        const settings = getSettings();
        setFollowedTopics(settings.followedTopics || []);

        // Trigger fetch (small delay to let state settle if needed, but here it's sync-ish)
        setTimeout(() => refreshTopics(false), 50);
    };

    const removeTopic = (topicId) => {
        removeFollowedTopic(topicId);
        setFollowedTopics(prev => prev.filter(t => t.id !== topicId));

        const newTopicNews = { ...topicNews };
        delete newTopicNews[topicId];
        setTopicNews(newTopicNews);
    };

    const addToHistory = (article) => {
        addReadArticle(article);
        // Regenerate suggestions
        refreshSuggestions();
    };

    const refreshSuggestions = () => {
        const sugs = getSuggestedTopics();
        setSuggestions(sugs);
    };

    const value = {
        followedTopics,
        topicNews,
        loading,
        suggestions,
        addTopic,
        removeTopic,
        refreshTopics,
        addToHistory
    };

    return (
        <TopicContext.Provider value={value}>
            {children}
        </TopicContext.Provider>
    );
}

export function useTopics() {
    return useContext(TopicContext);
}
