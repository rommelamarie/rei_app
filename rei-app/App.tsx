import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_CONTACTS } from './constants';
import { Contact, Message, AuthStatus, RegistrationRequest, Post } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import CommunityTab from './components/CommunityTab';
import NeuralBreachOverlay from './components/NeuralBreachOverlay';
import SettingsModal from './components/SettingsModal';
import NewChatModal from './components/NewChatModal';
import { generateAIResponse } from './services/geminiService';

const MESSAGE_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2550/2550-preview.mp3';

const App: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => {
    const saved = localStorage.getItem('rei_auth_status');
    return (saved as AuthStatus) || 'unauthenticated';
  });

  const [showNeuralOverlay, setShowNeuralOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(true);
  const [terminalKey, setTerminalKey] = useState(
    () => localStorage.getItem('rei_terminal_key') || 'REI_ADMIN'
  );
  const [view, setView] = useState<'chat' | 'admin'>('chat');
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('rei_dynamic_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });
  const [authorizedUsers, setAuthorizedUsers] = useState<RegistrationRequest[]>(() => {
    const saved = localStorage.getItem('rei_authorized_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [pendingRequests, setPendingRequests] = useState<RegistrationRequest[]>(() => {
    const saved = localStorage.getItem('rei_pending_requests');
    return saved ? JSON.parse(saved) : [];
  });
  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem('rei_community_posts');
    if (!saved) return [];
    const parsed: Post[] = JSON.parse(saved);
    return parsed.map(p => ({
      ...p,
      timestamp: new Date(p.timestamp),
      comments: p.comments?.map(c => ({ ...c, timestamp: new Date(c.timestamp) })),
    }));
  });
  const [activeContactId, setActiveContactId] = useState<string | 'community'>(contacts[0].id);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(true);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());

  const messageAudio = useRef<HTMLAudioElement | null>(null);

  // Persist contacts
  useEffect(() => {
    localStorage.setItem('rei_dynamic_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Persist authorized users
  useEffect(() => {
    localStorage.setItem('rei_authorized_users', JSON.stringify(authorizedUsers));
  }, [authorizedUsers]);

  // Persist pending requests
  useEffect(() => {
    localStorage.setItem('rei_pending_requests', JSON.stringify(pendingRequests));
  }, [pendingRequests]);

  // Persist community posts
  useEffect(() => {
    localStorage.setItem('rei_community_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    messageAudio.current = new Audio(MESSAGE_SOUND_URL);
    messageAudio.current.volume = 0.3;
    if (authStatus !== 'unauthenticated' && authStatus !== 'pending') {
      setShowNeuralOverlay(true);
    }
  }, [authStatus]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile) setShowSidebar(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [sessions, setSessions] = useState<Record<string, Message[]>>({
    'rei-ai': [{
      id: '1',
      text: 'Neural link established. I am REI, your primary core. How can I assist?',
      sender: 'bot',
      timestamp: new Date(),
      status: 'read'
    }],
  });

  const addMessage = useCallback((contactId: string, message: Message) => {
    setSessions(prev => ({ ...prev, [contactId]: [...(prev[contactId] || []), message] }));
    if (message.sender !== 'user' && messageAudio.current) {
      messageAudio.current.currentTime = 0;
      messageAudio.current.play().catch(() => {});
    }
  }, []);

  const handleSelectContact = (id: string | 'community') => {
    setActiveContactId(id);
    setView('chat');
    if (isMobileView) setShowSidebar(false);
  };

  const handleRegister = (username: string, answer: string, avatar?: string) => {
    // Admin login
    if (username === terminalKey) {
      localStorage.setItem('rei_auth_status', 'admin');
      setAuthStatus('admin');
      return;
    }
    // Regular user — add to pending requests & show pending screen
    const newRequest: RegistrationRequest = {
      username,
      answer,
      avatar,
      timestamp: new Date(),
    };
    setPendingRequests(prev => {
      const updated = [...prev.filter(r => r.username !== username), newRequest];
      localStorage.setItem('rei_pending_requests', JSON.stringify(updated));
      return updated;
    });
    localStorage.setItem('rei_auth_status', 'pending');
    localStorage.setItem('rei_pending_user', username);
    if (avatar) localStorage.setItem('rei_pending_avatar', avatar);
    setAuthStatus('pending');
  };

  const handleApprove = (username: string) => {
    const req = pendingRequests.find(r => r.username === username);
    if (!req) return;
    setAuthorizedUsers(prev => [...prev.filter(u => u.username !== username), req]);
    setPendingRequests(prev => prev.filter(r => r.username !== username));
    // If this user is currently pending in the browser, upgrade them
    if (localStorage.getItem('rei_pending_user') === username) {
      localStorage.setItem('rei_auth_status', 'authenticated');
    }
  };

  const handleReject = (username: string) => {
    setPendingRequests(prev => prev.filter(r => r.username !== username));
    if (localStorage.getItem('rei_pending_user') === username) {
      localStorage.removeItem('rei_auth_status');
      localStorage.removeItem('rei_pending_user');
    }
  };

  const handleKick = (username: string) => {
    setAuthorizedUsers(prev => prev.filter(u => u.username !== username));
  };

  const handleUpdateKey = (newKey: string) => {
    setTerminalKey(newKey);
    localStorage.setItem('rei_terminal_key', newKey);
  };

  const handleUpdateProfile = (updates: { username?: string; avatar?: string }) => {
    if (updates.username) {
      localStorage.setItem('rei_pending_user', updates.username);
    }
    if (updates.avatar) {
      localStorage.setItem('rei_pending_avatar', updates.avatar);
    }
  };

  const handleAddPost = (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    const newPost: Post = {
      id: Date.now().toString(),
      authorName: localStorage.getItem('rei_pending_user') || 'Authorized User',
      authorAvatar: localStorage.getItem('rei_pending_avatar') || 'https://picsum.photos/seed/user/200',
      content,
      mediaUrl,
      mediaType,
      timestamp: new Date(),
      likes: 0,
      hasLiked: false,
      comments: [],
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const handleLikePost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const hasLiked = !p.hasLiked;
      return { ...p, hasLiked, likes: (p.likes || 0) + (hasLiked ? 1 : -1) };
    }));
  };

  const handleCommentPost = (postId: string, content: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const newComment = {
        id: Date.now().toString(),
        authorName: localStorage.getItem('rei_pending_user') || 'Authorized User',
        authorAvatar: localStorage.getItem('rei_pending_avatar') || 'https://picsum.photos/seed/user/200',
        content,
        timestamp: new Date(),
      };
      return { ...p, comments: [...(p.comments || []), newComment] };
    }));
  };

  // Check if current pending user got approved
  useEffect(() => {
    if (authStatus === 'pending') {
      const pendingUser = localStorage.getItem('rei_pending_user');
      if (pendingUser && authorizedUsers.find(u => u.username === pendingUser)) {
        localStorage.setItem('rei_auth_status', 'authenticated');
        setAuthStatus('authenticated');
      }
    }
  }, [authorizedUsers, authStatus]);

  if (authStatus === 'unauthenticated' || authStatus === 'pending') {
    return (
      <AuthScreen
        status={authStatus === 'pending' ? 'pending' : 'unauthenticated'}
        onRegister={handleRegister}
      />
    );
  }

  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeMessages = sessions[activeContactId as string] || [];
  const currentUsername = localStorage.getItem('rei_pending_user') || 'Authorized User';
  const currentAvatar = localStorage.getItem('rei_pending_avatar') || 'https://picsum.photos/seed/user/200';

  return (
    <div className="flex h-[100dvh] w-full bg-[#050000] text-red-50 overflow-hidden relative">
      {showNeuralOverlay && (
        <NeuralBreachOverlay onComplete={() => setShowNeuralOverlay(false)} />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          isOnline={isUserOnline}
          onToggleStatus={() => setIsUserOnline(!isUserOnline)}
          currentUser={{
            username: currentUsername,
            avatar: currentAvatar,
            isAdmin: authStatus === 'admin'
          }}
          onUpdateProfile={handleUpdateProfile}
          terminalKey={terminalKey}
        />
      )}

      {isNewChatModalOpen && (
        <NewChatModal
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
          authorizedUsers={authorizedUsers}
          onSelectUser={(name, avatar) => {
            const newId = `user-${Date.now()}`;
            const newContact: Contact = {
              id: newId, name, avatar,
              isOnline: true, type: 'human',
              category: 'direct', lastSeen: 'Online'
            };
            setContacts(prev => [newContact, ...prev]);
            setActiveContactId(newId);
            setIsNewChatModalOpen(false);
            if (isMobileView) setShowSidebar(false);
          }}
        />
      )}

      {/* Sidebar */}
      <div className={`${isMobileView
        ? 'fixed inset-0 z-30 transition-transform duration-500'
        : 'w-80 md:w-96 border-r border-red-950'}
        ${isMobileView && !showSidebar ? '-translate-x-full' : 'translate-x-0'}
        bg-[#0a0101] flex flex-col h-full`}
      >
        <Sidebar
          contacts={contacts}
          activeContactId={activeContactId}
          onSelectContact={handleSelectContact}
          isAdmin={authStatus === 'admin'}
          pendingCount={pendingRequests.length}
          typingContacts={typingContacts}
          onOpenAdmin={() => { setView('admin'); if (isMobileView) setShowSidebar(false); }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenNewChat={() => setIsNewChatModalOpen(true)}
          onLogout={() => {
            localStorage.removeItem('rei_auth_status');
            window.location.reload();
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {view === 'admin' ? (
          <AdminDashboard
            requests={pendingRequests}
            authorizedUsers={authorizedUsers}
            onApprove={handleApprove}
            onReject={handleReject}
            onKick={handleKick}
            onUpdateKey={handleUpdateKey}
            currentKey={terminalKey}
            onBack={isMobileView ? () => setShowSidebar(true) : undefined}
          />
        ) : activeContactId === 'community' ? (
          <CommunityTab
            posts={posts}
            onAddPost={handleAddPost}
            onLikePost={handleLikePost}
            onCommentPost={handleCommentPost}
            currentUser={{ name: currentUsername, avatar: currentAvatar }}
            onBack={isMobileView ? () => setShowSidebar(true) : undefined}
          />
        ) : (
          activeContact && (
            <ChatWindow
              contact={activeContact}
              messages={activeMessages}
              onSendMessage={async (text) => {
                const contactId = activeContactId as string;
                addMessage(contactId, {
                  id: Date.now().toString(), text,
                  sender: 'user', timestamp: new Date(), status: 'sent'
                });
                if (activeContact.type === 'ai') {
                  setTypingContacts(p => new Set(p).add(contactId));
                  const res = await generateAIResponse(text);
                  setTypingContacts(p => { const n = new Set(p); n.delete(contactId); return n; });
                  addMessage(contactId, {
                    id: (Date.now() + 1).toString(), text: res.text,
                    sender: 'bot', timestamp: new Date(),
                    status: 'delivered', sources: res.sources
                  });
                }
              }}
              onMarkRead={() => {}}
              onBack={isMobileView ? () => setShowSidebar(true) : undefined}
              isTyping={typingContacts.has(activeContactId as string)}
            />
          )
        )}
      </div>
    </div>
  );
};

export default App;
