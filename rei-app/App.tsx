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
import { supabase } from './services/supabaseClient';

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
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);
  const authorizedUsers = registrationRequests.filter(r => r.status === 'approved');
  const pendingRequests = registrationRequests.filter(r => r.status === 'pending');
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | 'community'>(contacts[0].id);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(true);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());

  const messageAudio = useRef<HTMLAudioElement | null>(null);

  // Persist contacts
  useEffect(() => {
    localStorage.setItem('rei_dynamic_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Load registration requests from Supabase and keep them live across devices
  useEffect(() => {
    const loadRequests = async () => {
      const { data, error } = await supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) { console.error(error); return; }
      setRegistrationRequests(data.map(row => ({
        username: row.username,
        answer: row.answer,
        avatar: row.avatar,
        status: row.status,
        timestamp: new Date(row.created_at),
      })));
    };
    loadRequests();
    const channel = supabase
      .channel('registration_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registration_requests' }, loadRequests)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load community posts (with comments) from Supabase and keep them live across devices
  useEffect(() => {
    const loadPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, comments(*)')
        .order('created_at', { ascending: false });
      if (error) { console.error(error); return; }
      setPosts(data.map((row: any) => ({
        id: row.id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        content: row.content,
        mediaUrl: row.media_url,
        mediaType: row.media_type,
        timestamp: new Date(row.created_at),
        likes: row.likes,
        hasLiked: row.has_liked,
        comments: (row.comments || [])
          .map((c: any) => ({
            id: c.id,
            authorName: c.author_name,
            authorAvatar: c.author_avatar,
            content: c.content,
            timestamp: new Date(c.created_at),
          }))
          .sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime()),
      })));
    };
    loadPosts();
    const channel = supabase
      .channel('posts_and_comments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, loadPosts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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

  const handleRegister = async (username: string, answer: string, avatar?: string) => {
    // Admin login
    if (username === terminalKey) {
      localStorage.setItem('rei_auth_status', 'admin');
      setAuthStatus('admin');
      return;
    }
    // Regular user — add to pending requests (shared across devices) & show pending screen
    const { error } = await supabase
      .from('registration_requests')
      .upsert({ username, answer, avatar, status: 'pending' }, { onConflict: 'username' });
    if (error) console.error(error);
    localStorage.setItem('rei_auth_status', 'pending');
    localStorage.setItem('rei_pending_user', username);
    if (avatar) localStorage.setItem('rei_pending_avatar', avatar);
    setAuthStatus('pending');
  };

  const handleApprove = async (username: string) => {
    const { error } = await supabase
      .from('registration_requests')
      .update({ status: 'approved' })
      .eq('username', username);
    if (error) console.error(error);
    // If this user is currently pending in the browser, upgrade them
    if (localStorage.getItem('rei_pending_user') === username) {
      localStorage.setItem('rei_auth_status', 'authenticated');
    }
  };

  const handleReject = async (username: string) => {
    const { error } = await supabase
      .from('registration_requests')
      .delete()
      .eq('username', username);
    if (error) console.error(error);
    if (localStorage.getItem('rei_pending_user') === username) {
      localStorage.removeItem('rei_auth_status');
      localStorage.removeItem('rei_pending_user');
    }
  };

  const handleKick = async (username: string) => {
    const { error } = await supabase
      .from('registration_requests')
      .delete()
      .eq('username', username);
    if (error) console.error(error);
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

  const handleAddPost = async (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    const { error } = await supabase.from('posts').insert({
      author_name: localStorage.getItem('rei_pending_user') || 'Authorized User',
      author_avatar: localStorage.getItem('rei_pending_avatar') || 'https://picsum.photos/seed/user/200',
      content,
      media_url: mediaUrl,
      media_type: mediaType,
    });
    if (error) console.error(error);
  };

  const handleLikePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const hasLiked = !post.hasLiked;
    const { error } = await supabase
      .from('posts')
      .update({ has_liked: hasLiked, likes: (post.likes || 0) + (hasLiked ? 1 : -1) })
      .eq('id', postId);
    if (error) console.error(error);
  };

  const handleCommentPost = async (postId: string, content: string) => {
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      author_name: localStorage.getItem('rei_pending_user') || 'Authorized User',
      author_avatar: localStorage.getItem('rei_pending_avatar') || 'https://picsum.photos/seed/user/200',
      content,
    });
    if (error) console.error(error);
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
