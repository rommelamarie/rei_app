import React, { useState, useEffect } from 'react';
import { Contact } from '../types';
import { Search, MoreVertical, Edit, MessageSquare, Bot, Settings, LogOut, ShieldAlert, Download, Globe, Loader2, User } from 'lucide-react';
import SpiderLily from './SpiderLily';

interface SidebarProps {
  contacts: Contact[];
  activeContactId: string | 'community';
  onSelectContact: (id: string | 'community') => void;
  isAdmin?: boolean;
  pendingCount?: number;
  typingContacts?: Set<string>;
  onOpenAdmin?: () => void;
  onOpenSettings?: () => void;
  onOpenNewChat?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  contacts, 
  activeContactId, 
  onSelectContact, 
  isAdmin, 
  pendingCount = 0,
  typingContacts = new Set(),
  onOpenAdmin,
  onOpenSettings,
  onOpenNewChat,
  onOpenProfile,
  onLogout
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'direct' | 'group' | 'bot'>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') setDeferredPrompt(null);
      });
    } else {
      alert("App is already synced or standalone link is required.");
    }
    setShowMenu(false);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) && 
    (filter === 'all' || c.category === filter)
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative border-r border-red-950/20">
      {/* Immersive Background Logo - Pulsing */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <SpiderLily size={450} className="text-red-900/10 rotate-45 animate-neural-glow blur-[2px]" />
      </div>

      <div className="p-4 bg-[#0a0101]/95 backdrop-blur-md sticky top-0 z-20 mobile-safe-top">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 group">
            <SpiderLily size={32} className="text-red-600 animate-neural-glow" />
            <h1 className="text-xl font-black text-red-50 tracking-tighter uppercase italic">REI</h1>
          </div>
          <div className="flex space-x-1 relative items-center">
            <button 
              onClick={onOpenNewChat}
              className="p-2.5 text-red-400 hover:bg-red-900/20 rounded-full transition-all active:scale-90"
              title="New Message"
            >
              <Edit size={20} />
            </button>

            {isAdmin && (
              <button 
                onClick={onOpenAdmin}
                className="p-2.5 hover:bg-red-900/20 rounded-full text-red-500 transition-colors relative"
              >
                <ShieldAlert size={20} />
                {pendingCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                )}
              </button>
            )}
            
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2.5 hover:bg-red-900/20 rounded-full text-red-300 transition-colors"
              >
                <MoreVertical size={20} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a0505] border border-red-900/50 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in duration-200 overflow-hidden">
                  <button onClick={handleInstallClick} className="w-full flex items-center px-5 py-4 text-sm text-red-100 hover:bg-red-900/30 transition-colors">
                    <Download size={16} className="mr-3 text-red-500" /> Standalone Client
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onOpenProfile?.(); }}
                    className="w-full flex items-center px-5 py-4 text-sm text-red-100 hover:bg-red-900/30 transition-colors"
                  >
                    <User size={16} className="mr-3 text-red-500" /> My Profile
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onOpenSettings?.(); }}
                    className="w-full flex items-center px-5 py-4 text-sm text-red-100 hover:bg-red-900/30 transition-colors"
                  >
                    <Settings size={16} className="mr-3 text-red-500" /> Neural Prefs
                  </button>
                  <button onClick={onLogout} className="w-full flex items-center px-5 py-4 text-sm text-red-500 hover:bg-red-900/30 transition-colors border-t border-red-900/30 font-bold">
                    <LogOut size={16} className="mr-3" /> Terminate Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-red-900" size={16} />
          <input 
            type="text" 
            placeholder="Search network..."
            className="w-full pl-11 pr-4 py-2.5 bg-red-950/20 border border-red-900/20 rounded-xl focus:ring-1 focus:ring-red-600 transition-all outline-none text-sm text-red-50 placeholder-red-900/60 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
          <FilterButton active={activeContactId === 'community'} onClick={() => onSelectContact('community')} icon={<Globe size={14}/>} label="Hub" />
          <FilterButton active={filter === 'all' && activeContactId !== 'community'} onClick={() => setFilter('all')} icon={<MessageSquare size={14}/>} label="All" />
          <FilterButton active={filter === 'bot'} onClick={() => setFilter('bot')} icon={<Bot size={14}/>} label="Cores" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar mobile-safe-bottom">
        {filteredContacts.map(contact => {
          const isTyping = typingContacts.has(contact.id);
          const isActive = activeContactId === contact.id;
          return (
            <button
              key={contact.id}
              onClick={() => onSelectContact(contact.id)}
              className={`w-full flex items-center p-4 transition-all hover:bg-red-950/10 group relative ${isActive ? 'bg-red-950/20' : ''}`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
              )}
              
              <div className="relative flex-shrink-0">
                <img src={contact.avatar} alt={contact.name} className={`w-12 h-12 rounded-full object-cover border border-red-900/30 grayscale-[0.3] group-hover:grayscale-0 transition-all ${isTyping ? 'animate-pulse' : ''}`} />
                {contact.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0a0101] rounded-full" />
                )}
              </div>

              <div className="ml-4 flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-bold truncate text-[15px] ${isTyping ? 'text-red-500' : 'text-red-50'}`}>{contact.name}</span>
                  <span className="text-[9px] text-red-900 font-black uppercase ml-2">{isTyping ? 'Syncing' : contact.lastSeen}</span>
                </div>
                {isTyping ? (
                  <p className="text-[11px] font-black uppercase text-red-600 tracking-widest italic flex items-center">
                    <Loader2 size={10} className="animate-spin mr-1.5" /> Neural Processing
                  </p>
                ) : (
                  <p className={`text-xs truncate leading-tight ${isActive ? 'text-red-200' : 'text-red-800'}`}>
                    {contact.lastMessage}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FilterButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
      active ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-red-950/40 text-red-800 border-red-900/20 hover:text-red-400'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default Sidebar;