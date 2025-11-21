import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Tv, 
  GraduationCap, 
  Menu, 
  Bell, 
  Search,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LogIn
} from 'lucide-react';
import { Page } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export const TopBar: React.FC = () => {
  const { currentUser, login, logout } = useAuth();

  return (
    <div className="h-16 bg-dark-surface border-b border-dark-border flex items-center justify-between px-4 sticky top-0 z-20 shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-900/50">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
          ChessCampus
        </h1>
      </div>

      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search players, streams, or threads..." 
            className="w-full bg-dark-bg border border-dark-border rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-500 transition-colors text-slate-200"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:text-white hover:bg-dark-border rounded-full transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-dark-surface"></span>
        </button>
        
        {currentUser ? (
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-white">{currentUser.displayName}</span>
                <span className="text-xs text-brand-400">{currentUser.rating} ELO</span>
             </div>
             <div className="group relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 p-[2px] cursor-pointer">
                    <img 
                        src={currentUser.photoURL} 
                        alt="Profile" 
                        className="w-full h-full rounded-full object-cover border-2 border-dark-surface"
                    />
                </div>
                <div className="absolute right-0 mt-2 w-48 bg-dark-surface border border-dark-border rounded-lg shadow-xl py-1 hidden group-hover:block">
                   <button 
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-dark-bg flex items-center gap-2"
                   >
                     <LogOut className="w-4 h-4" /> Sign Out
                   </button>
                </div>
             </div>
          </div>
        ) : (
          <button 
            onClick={login}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        )}
      </div>
    </div>
  );
};

export const Sidebar: React.FC<NavigationProps> = ({ activePage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: Page.STREAM_HUB, label: 'Stream Hub', icon: Tv },
    { id: Page.FORUM, label: 'Community', icon: Users },
    { id: Page.PLAY_AREA, label: 'Play & Analyze', icon: LayoutDashboard },
    { id: Page.PRIVATE_LESSON, label: 'Private Lesson', icon: GraduationCap },
  ];

  return (
    <div className={`flex flex-col bg-dark-surface border-r border-dark-border transition-all duration-300 h-full ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex-1 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center px-4 py-3 transition-all duration-200 relative group
                ${isActive ? 'text-brand-400 bg-brand-900/20 border-r-4 border-brand-500' : 'text-slate-400 hover:bg-dark-border hover:text-slate-100'}
              `}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-100'} transition-colors`} />
              
              <span className={`ml-4 font-medium whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                {item.label}
              </span>

              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-dark-border">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-dark-border transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : (
            <div className="flex items-center w-full">
               <ChevronLeft className="w-5 h-5" />
               <span className="ml-2 text-sm">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
