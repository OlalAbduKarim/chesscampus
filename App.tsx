import React, { useState } from 'react';
import { TopBar, Sidebar, BottomNav } from './components/Navigation';
import StreamHub from './pages/StreamHub';
import Forum from './pages/Forum';
import PlayArea from './pages/PlayArea';
import PrivateLesson from './pages/PrivateLesson';
import { Page } from './types';
import { AuthProvider } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.STREAM_HUB);

  const renderPage = () => {
    switch (activePage) {
      case Page.STREAM_HUB:
        return <StreamHub />;
      case Page.FORUM:
        return <Forum />;
      case Page.PLAY_AREA:
        return <PlayArea />;
      case Page.PRIVATE_LESSON:
        return <PrivateLesson />;
      default:
        return <StreamHub />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-dark-bg text-slate-200 font-sans">
      <TopBar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        
        {/* Main Content - Removed global pb-16 to allow pages to handle scrolling and safe areas internally */}
        <main className="flex-1 overflow-hidden relative bg-dark-bg flex flex-col">
          {renderPage()}
        </main>

        <BottomNav activePage={activePage} onNavigate={setActivePage} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;