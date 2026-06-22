import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { INITIAL_CONTACTS } from './constants';
import { Contact, Message, AuthStatus, UserProfile, Post } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import CommunityTab from './components/CommunityTab';
import NeuralBreachOverlay from './components/NeuralBreachOverlay';
import SettingsModal from './components/SettingsModal';
import NewChatModal from './components/NewChatModal';
import ProfileView from './components/ProfileView';
import { generateAIResponse } from './services/geminiService';
import { supabase } from './services/supabaseClient';

const MESSAGE_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2550/2550-preview.mp3';
const DEFAULT_AVATAR = 'https://picsum.photos/seed/user/200';

const mapProfileRow = (row: any): UserProfile => ({
  id: row.id,
  username: `${row.first_name} ${row.last_name}`.trim(),
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  avatar: row.avatar,
  bio: row.bio,
  joinedAt: new Date(row.created_at),
});

const App: React.FC = () => {
  const [isAdminLocal, setIsAdminLocal] = useState(
    () => localStorage.getItem('rei_auth_status') === 'admin'
  );
  const [session, setSession] = useState<Session | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const authStatus: AuthStatus = isAdminLocal ? 'admin' : session ? 'authenticated' : 'unauthenticated';

  const [showNeuralOverlay, setShowNeuralOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(true);
  const [terminalKey, setTerminalKey] = useState(
    () => localStorage.getItem('rei_terminal_key') || 'REI_ADMIN'
  );
  const [view, setView] = useState<'chat' | 'admin' | 'profile'>('chat');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('rei_dynamic_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
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

  // Track the Supabase auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load my own profile whenever the session changes
  useEffect(() => {
    if (!session) { setMyProfile(null); return; }
    const loadMyProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (error) { console.error(error); return; }
      if (data) setMyProfile(mapProfileRow(data));
    };
    loadMyProfile();
  }, [session]);

  // Load all profiles (for Admin Network Map / New Message) and keep them live across devices
  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) { console.error(error); return; }
      setUsers(data.map(mapProfileRow));
    };
    loadUsers();
    const channel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadUsers)
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
        authorId: row.author_id,
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
            authorId: c.author_id,
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
    if (authStatus !== 'unauthenticated') {
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

  const handleAdminLogin = (key: string) => {
    if (key === terminalKey) {
      localStorage.setItem('rei_auth_status', 'admin');
      setIsAdminLocal(true);
    }
  };

  const handleSignUp = async ({ firstName, lastName, email, password, avatar }: {
    firstName: string; lastName: string; email: string; password: string; avatar?: string;
  }): Promise<string | void> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    const userId = data.user?.id;
    if (!userId) return 'Check your email to confirm your account, then sign in.';

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
      avatar,
    });
    if (profileError) return profileError.message;

    if (!data.session) return 'Check your email to confirm your account, then sign in.';
  };

  const handleSignIn = async ({ email, password }: { email: string; password: string }): Promise<string | void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
  };

  const handleKick = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) console.error(error);
  };

  const handleUpdateKey = (newKey: string) => {
    setTerminalKey(newKey);
    localStorage.setItem('rei_terminal_key', newKey);
  };

  const handleUpdateProfile = async (updates: { username?: string; avatar?: string }) => {
    if (!session || !updates.avatar) return;
    const { error } = await supabase
      .from('profiles')
      .update({ avatar: updates.avatar })
      .eq('id', session.user.id);
    if (error) throw error;
    setMyProfile(prev => prev ? { ...prev, avatar: updates.avatar } : prev);
  };

  const handleAddPost = async (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    const { error } = await supabase.from('posts').insert({
      author_id: myProfile?.id,
      author_name: myProfile?.username || 'Authorized User',
      author_avatar: myProfile?.avatar || DEFAULT_AVATAR,
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
      author_id: myProfile?.id,
      author_name: myProfile?.username || 'Authorized User',
      author_avatar: myProfile?.avatar || DEFAULT_AVATAR,
      content,
    });
    if (error) console.error(error);
  };

  const handleViewProfile = (id: string) => {
    setViewingProfileId(id);
    setView('profile');
    if (isMobileView) setShowSidebar(false);
  };

  const handleSaveProfile = async (updates: { firstName: string; lastName: string; bio: string; avatar?: string }) => {
    if (!session) return;
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: updates.firstName, last_name: updates.lastName, bio: updates.bio, avatar: updates.avatar })
      .eq('id', session.user.id);
    if (error) throw error;
    setMyProfile(prev => prev ? {
      ...prev,
      firstName: updates.firstName,
      lastName: updates.lastName,
      username: `${updates.firstName} ${updates.lastName}`.trim(),
      bio: updates.bio,
      avatar: updates.avatar,
    } : prev);
  };

  if (authStatus === 'unauthenticated') {
    return (
      <AuthScreen
        onSignUp={handleSignUp}
        onSignIn={handleSignIn}
        onAdminLogin={handleAdminLogin}
      />
    );
  }

  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeMessages = sessions[activeContactId as string] || [];
  const currentUsername = authStatus === 'admin' ? 'Admin' : (myProfile?.username || 'Authorized User');
  const currentAvatar = myProfile?.avatar || DEFAULT_AVATAR;

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
          authorizedUsers={users}
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
          pendingCount={0}
          typingContacts={typingContacts}
          onOpenAdmin={() => { setView('admin'); if (isMobileView) setShowSidebar(false); }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenNewChat={() => setIsNewChatModalOpen(true)}
          onOpenProfile={() => myProfile && handleViewProfile(myProfile.id)}
          onLogout={async () => {
            await supabase.auth.signOut();
            localStorage.removeItem('rei_auth_status');
            window.location.reload();
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {view === 'admin' ? (
          <AdminDashboard
            users={users}
            onKick={handleKick}
            onViewProfile={handleViewProfile}
            onUpdateKey={handleUpdateKey}
            currentKey={terminalKey}
            onBack={isMobileView ? () => setShowSidebar(true) : undefined}
          />
        ) : view === 'profile' ? (
          (() => {
            const profile = users.find(u => u.id === viewingProfileId) || (myProfile?.id === viewingProfileId ? myProfile : null);
            if (!profile) return null;
            const isOwnProfile = session?.user.id === viewingProfileId;
            return (
              <ProfileView
                profile={profile}
                posts={posts.filter(p => p.authorId === viewingProfileId)}
                isOwnProfile={isOwnProfile}
                onSave={isOwnProfile ? handleSaveProfile : undefined}
                onBack={() => setView('chat')}
              />
            );
          })()
        ) : activeContactId === 'community' ? (
          <CommunityTab
            posts={posts}
            onAddPost={handleAddPost}
            onLikePost={handleLikePost}
            onCommentPost={handleCommentPost}
            currentUser={{ name: currentUsername, avatar: currentAvatar }}
            onBack={isMobileView ? () => setShowSidebar(true) : undefined}
            onViewProfile={handleViewProfile}
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
