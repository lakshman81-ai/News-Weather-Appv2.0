import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import UpAheadPage from './pages/UpAheadPage';
import WeatherPage from './pages/WeatherPage';
import MarketPage from './pages/MarketPage';
import TechSocialPage from './pages/TechSocialPage';
import NewspaperPage from './pages/NewspaperPage';
import SettingsPage from './pages/SettingsPage';
import RefreshPage from './pages/RefreshPage';
import FollowingPage from './pages/FollowingPage';
import TopicDetail from './pages/TopicDetail';
import BottomNav from './components/BottomNav';
import ScrollToTop from './components/ScrollToTop';
import { WeatherProvider } from './context/WeatherContext';
import { NewsProvider } from './context/NewsContext';
import { MarketProvider } from './context/MarketContext';
import { SettingsProvider } from './context/SettingsContext';
import { SegmentProvider } from './context/SegmentContext';
import { TopicProvider } from './context/TopicContext';
import './index.css';

function App() {
  return (
    <SettingsProvider>
      <SegmentProvider>
        <WeatherProvider>
          <NewsProvider>
            <MarketProvider>
              <TopicProvider>
                <HashRouter>
                <ScrollToTop />
                <div className="app">
                  <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/up-ahead" element={<UpAheadPage />} />
                    <Route path="/weather" element={<WeatherPage />} />
                    <Route path="/markets" element={<MarketPage />} />
                    <Route path="/tech-social" element={<TechSocialPage />} />
                    <Route path="/newspaper" element={<NewspaperPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/refresh" element={<RefreshPage />} />
                    <Route path="/following" element={<FollowingPage />} />
                    <Route path="/following/:topicId" element={<TopicDetail />} />
                  </Routes>
                  <BottomNav />
                </div>
                </HashRouter>
              </TopicProvider>
            </MarketProvider>
          </NewsProvider>
        </WeatherProvider>
      </SegmentProvider>
    </SettingsProvider>
  );
}

export default App;
