import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { INITIAL_CONTACTS } from './constants';
import { Contact, Message, AuthStatus, UserProfile, Post, Testimonial, ConnectionRequest } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import CommunityTab from './components/CommunityTab';
import NeuralBreachOverlay from './components/NeuralBreachOverlay';
import SettingsModal from './components/SettingsModal';
import NewChatModal from './components/NewChatModal';
import ProfileView from './components/ProfileView';
import NeuralLink from './components/NeuralLink';
import CallOverlay, { CallStatus, CallType } from './components/CallOverlay';
import { generateAIResponse } from './services/geminiService';
import { supabase } from './services/supabaseClient';

const MESSAGE_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/598/598-preview.mp3';
const DEFAULT_AVATAR = 'https://picsum.photos/seed/user/200';
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

interface CallState {
  status: CallStatus;
  callId: string;
  type: CallType;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  isCaller: boolean;
}

const mapProfileRow = (row: any): UserProfile => ({
  id: row.id,
  username: `${row.first_name} ${row.last_name}`.trim(),
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  avatar: row.avatar,
  nickname: row.nickname,
  bio: row.bio,
  school: row.school,
  work: row.work,
  hobby: row.hobby,
  interests: row.interests,
  isPublic: row.is_public ?? true,
  role: row.role || 'user',
  joinedAt: new Date(row.created_at),
});

const displayName = (profile: UserProfile | null): string =>
  profile?.nickname?.trim() || profile?.username || 'Authorized User';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const authStatus: AuthStatus = !session ? 'unauthenticated' : myProfile?.role === 'admin' ? 'admin' : 'authenticated';

  const [showNeuralOverlay, setShowNeuralOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(true);
  const [view, setView] = useState<'chat' | 'admin' | 'profile' | 'neural-link'>('chat');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('rei_dynamic_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [directMessages, setDirectMessages] = useState<Message[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | 'community' | 'hub'>(contacts[0].id);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(true);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());

  const messageAudio = useRef<HTMLAudioElement | null>(null);

  // Calling (WebRTC, signaled over Supabase Realtime broadcast)
  const [callState, setCallState] = useState<CallState | null>(null);
  const [callListenerStatus, setCallListenerStatus] = useState('init');
  const [outgoingCallDebug, setOutgoingCallDebug] = useState('');
  const [incomingOffer, setIncomingOffer] = useState<{ callId: string; callerId: string; callerName: string; callerAvatar: string; type: CallType; sdp: RTCSessionDescriptionInit } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callStateRef = useRef<CallState | null>(null);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

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

  // Load my own profile whenever the session changes. If a signed-in user
  // has no profile row (e.g. an admin "Kick" deletes the profile but not
  // the login itself, leaving a valid session with nothing to back it),
  // self-heal a minimal one instead of leaving every profile-dependent
  // action (Neural Link, testimonials, posts) silently/confusingly broken.
  useEffect(() => {
    if (!session) { setMyProfile(null); return; }
    const loadMyProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (error) { console.error(error); return; }
      if (data) { setMyProfile(mapProfileRow(data)); return; }

      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({ id: session.user.id, first_name: 'Unnamed', last_name: 'Subject', email: session.user.email })
        .select('*')
        .single();
      if (createError) { console.error('[profile] self-heal failed:', createError); return; }
      setMyProfile(mapProfileRow(created));
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
        postType: row.post_type,
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

  // Load testimonials for the profile currently being viewed and keep them live
  useEffect(() => {
    if (view !== 'profile' || !viewingProfileId) { setTestimonials([]); return; }
    const loadTestimonials = async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('profile_id', viewingProfileId)
        .order('created_at', { ascending: false });
      if (error) { console.error(error); return; }
      setTestimonials(data.map((row: any) => ({
        id: row.id,
        profileId: row.profile_id,
        authorId: row.author_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        content: row.content,
        status: row.status,
        timestamp: new Date(row.created_at),
      })));
    };
    loadTestimonials();
    const channel = supabase
      .channel(`testimonials_${viewingProfileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonials', filter: `profile_id=eq.${viewingProfileId}` }, loadTestimonials)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [view, viewingProfileId]);

  // Load the current user's Neural Link connections and keep them live
  useEffect(() => {
    if (!session) { setConnectedIds(new Set()); return; }
    const loadConnections = async () => {
      const { data, error } = await supabase
        .from('connections')
        .select('connection_id')
        .eq('user_id', session.user.id);
      if (error) { console.error(error); return; }
      setConnectedIds(new Set(data.map((row: any) => row.connection_id)));
    };
    loadConnections();
    const channel = supabase
      .channel(`connections_${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `user_id=eq.${session.user.id}` }, loadConnections)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // Load Neural Link requests (sent or received by me) and keep them live
  useEffect(() => {
    if (!session) { setConnectionRequests([]); return; }
    const myId = session.user.id;
    const mapRequestRow = (row: any): ConnectionRequest => ({
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      status: row.status,
      timestamp: new Date(row.created_at),
    });
    const loadRequests = async () => {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('*')
        .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
        .order('created_at', { ascending: false });
      if (error) { console.error(error); return; }
      setConnectionRequests(data.map(mapRequestRow));
    };
    loadRequests();
    const channel = supabase
      .channel(`connection_requests_${myId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests' }, loadRequests)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // Load my direct messages and keep them live; play a sound and ensure a
  // contact entry exists whenever a new message arrives for me.
  useEffect(() => {
    if (!session) { setDirectMessages([]); return; }
    const myId = session.user.id;

    const mapMessageRow = (row: any): Message => ({
      id: row.id,
      text: row.content,
      sender: row.sender_id === myId ? 'user' : 'bot',
      timestamp: new Date(row.created_at),
      status: 'delivered',
      senderId: row.sender_id,
      recipientId: row.recipient_id,
    });

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
        .order('created_at', { ascending: true });
      if (error) { console.error(error); return; }
      setDirectMessages(data.map(mapMessageRow));
    };
    loadMessages();

    const channel = supabase
      .channel(`messages_${myId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const row = payload.new;
        if (row.sender_id !== myId && row.recipient_id !== myId) return;
        setDirectMessages(prev => [...prev, mapMessageRow(row)]);

        if (row.recipient_id === myId && row.sender_id !== myId) {
          if (messageAudio.current) {
            messageAudio.current.currentTime = 0;
            messageAudio.current.play().catch(() => {});
          }
          setContacts(prev => {
            const exists = prev.some(c => c.profileId === row.sender_id);
            if (exists) {
              return prev.map(c => c.profileId === row.sender_id
                ? { ...c, lastMessage: row.content, lastSeen: 'Just now' }
                : c);
            }
            const senderProfile = users.find(u => u.id === row.sender_id);
            if (!senderProfile) return prev;
            const newContact: Contact = {
              id: `user-${row.sender_id}`,
              profileId: row.sender_id,
              name: displayName(senderProfile),
              avatar: senderProfile.avatar || DEFAULT_AVATAR,
              isOnline: true,
              type: 'human',
              category: 'direct',
              lastMessage: row.content,
              lastSeen: 'Just now',
            };
            return [newContact, ...prev];
          });
        } else if (row.sender_id === myId) {
          setContacts(prev => prev.map(c => c.profileId === row.recipient_id
            ? { ...c, lastMessage: row.content, lastSeen: 'Just now' }
            : c));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, users]);

  // Self-heal the contact list from real message history. Contacts only
  // live in localStorage, so a conversation partner can otherwise vanish
  // after clearing storage, switching browsers/devices, etc. even though
  // the actual messages are safely persisted in Supabase.
  useEffect(() => {
    if (!session || directMessages.length === 0 || users.length === 0) return;
    const myId = session.user.id;
    const lastMessageByPartner = new Map<string, Message>();
    directMessages.forEach(m => {
      const partnerId = m.senderId === myId ? m.recipientId : m.senderId;
      if (!partnerId || partnerId === myId) return;
      const existing = lastMessageByPartner.get(partnerId);
      if (!existing || m.timestamp > existing.timestamp) lastMessageByPartner.set(partnerId, m);
    });

    setContacts(prev => {
      const existingProfileIds = new Set(prev.map(c => c.profileId).filter(Boolean));
      const missingIds = Array.from(lastMessageByPartner.keys()).filter(id => !existingProfileIds.has(id));
      const restored: Contact[] = missingIds.map(id => {
        const profile = users.find(u => u.id === id);
        const lastMsg = lastMessageByPartner.get(id);
        return {
          id: `user-${id}`,
          profileId: id,
          name: profile ? displayName(profile) : 'Unknown',
          avatar: profile?.avatar || DEFAULT_AVATAR,
          isOnline: true,
          type: 'human',
          category: 'direct',
          lastMessage: lastMsg?.text,
          lastSeen: 'Online',
        };
      });
      const merged = [...restored, ...prev];

      // Drop stale duplicates: a human contact sharing a name with another
      // contact, but with zero real message history under its profileId,
      // is almost always a leftover pointer to an old/orphaned account
      // (e.g. from early test signups) rather than a real distinct person.
      // Calling/messaging through it silently targets the wrong account.
      const namesWithHistory = new Set(
        merged.filter(c => c.type === 'human' && c.profileId && lastMessageByPartner.has(c.profileId))
          .map(c => c.name.toLowerCase())
      );
      const deduped = merged.filter(c => {
        if (c.type !== 'human' || !c.profileId) return true;
        if (lastMessageByPartner.has(c.profileId)) return true;
        return !namesWithHistory.has(c.name.toLowerCase());
      });

      if (deduped.length === merged.length && missingIds.length === 0) return prev;
      return deduped;
    });
  }, [directMessages, users, session]);

  // Listen globally for incoming calls, regardless of which chat is open.
  // Keyed only on the user id (not the whole session object or callState)
  // so this subscription doesn't tear down and rebuild on every token
  // refresh or call-state change — each resubscribe is a window where an
  // incoming call-offer broadcast could be missed entirely, since
  // broadcasts aren't queued for anyone not subscribed at that instant.
  const myUserId = session?.user.id;
  const [visibilityTick, setVisibilityTick] = useState(0);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setVisibilityTick(t => t + 1); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  useEffect(() => {
    if (!myUserId) return;
    const channel = supabase
      .channel(`user-calls-${myUserId}`)
      .on('broadcast', { event: 'call-offer' }, ({ payload }: any) => {
        console.log('[call] received call-offer', payload);
        if (callStateRef.current) {
          // already on a call — let the caller's attempt time out
          return;
        }
        setIncomingOffer(payload);
        setCallState({
          status: 'ringing',
          callId: payload.callId,
          type: payload.type,
          peerId: payload.callerId,
          peerName: payload.callerName,
          peerAvatar: payload.callerAvatar,
          isCaller: false,
        });
      })
      .subscribe((status) => {
        console.log('[call] global listener status:', status, `user-calls-${myUserId}`);
        setCallListenerStatus(status);
      });
    return () => { supabase.removeChannel(channel); };
  }, [myUserId, visibilityTick]);

  // Single source of truth for the ring/ring-back tone: play while calling
  // (caller) or ringing (callee), stop the moment that's no longer true.
  useEffect(() => {
    const shouldRing = callState?.status === 'calling' || (callState?.status === 'ringing' && !callState.isCaller);
    if (!ringtoneRef.current) return;
    if (shouldRing) {
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(() => {});
    } else {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [callState?.status, callState?.isCaller]);

  const endCallCleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    if (callChannelRef.current) { supabase.removeChannel(callChannelRef.current); callChannelRef.current = null; }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }
    setIsMuted(false);
    setIsCameraOff(false);
    setIncomingOffer(null);
    setCallState(null);
  }, [localStream]);

  const sendOnce = (channelName: string, event: string, payload: any, attempt = 1) => {
    setOutgoingCallDebug(`targeting ${channelName} (${event}) attempt ${attempt}: subscribing...`);
    const channel = supabase.channel(channelName);
    channel.subscribe((status) => {
      console.log(`[call] sendOnce(${channelName}, ${event}) attempt ${attempt} status:`, status);
      setOutgoingCallDebug(`targeting ${channelName} (${event}) attempt ${attempt}: subscribe=${status}`);
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event, payload }).then((res) => {
          console.log(`[call] sendOnce(${channelName}, ${event}) send result:`, res);
          setOutgoingCallDebug(`targeting ${channelName} (${event}) attempt ${attempt}: subscribe=SUBSCRIBED, send=${res}`);
        });
        setTimeout(() => supabase.removeChannel(channel), 3000);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.error(`[call] sendOnce(${channelName}, ${event}) attempt ${attempt} failed to subscribe:`, status);
        supabase.removeChannel(channel);
        if (attempt < 3) {
          setTimeout(() => sendOnce(channelName, event, payload, attempt + 1), 500);
        }
      }
    });
  };

  const createPeerConnection = (callId: string, myId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        callChannelRef.current?.send({ type: 'broadcast', event: 'ice-candidate', payload: { candidate: e.candidate, from: myId } });
      }
    };
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);
    return pc;
  };

  const subscribeCallChannel = (callId: string, myId: string) => {
    const channel = supabase
      .channel(`call-${callId}`)
      .on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
        if (payload.from === myId || !pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        setCallState(prev => prev ? { ...prev, status: 'active' } : prev);
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
        if (payload.from === myId || !pcRef.current) return;
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { console.error(e); }
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }: any) => {
        if (payload.from === myId) return;
        endCallCleanup();
      })
      .on('broadcast', { event: 'call-declined' }, ({ payload }: any) => {
        if (payload.from === myId) return;
        endCallCleanup();
      })
      .subscribe();
    callChannelRef.current = channel;
  };

  const handleStartCall = async (contact: Contact, type: CallType) => {
    if (!contact.profileId || !session) return;
    if (!connectedIds.has(contact.profileId)) {
      alert('You can only call people in your Neural Link.');
      return;
    }
    const myId = session.user.id;
    const callId = crypto.randomUUID();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      setCallState({ status: 'calling', callId, type, peerId: contact.profileId, peerName: contact.name, peerAvatar: contact.avatar, isCaller: true });

      const pc = createPeerConnection(callId, myId);
      pcRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      subscribeCallChannel(callId, myId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendOnce(`user-calls-${contact.profileId}`, 'call-offer', {
        callId, callerId: myId, callerName: displayName(myProfile), callerAvatar: myProfile?.avatar || DEFAULT_AVATAR, type, sdp: offer,
      });

      callTimeoutRef.current = setTimeout(() => {
        callChannelRef.current?.send({ type: 'broadcast', event: 'call-end', payload: { from: myId } });
        endCallCleanup();
      }, 30000);
    } catch (err) {
      console.error(err);
      alert('Could not access camera/microphone.');
      endCallCleanup();
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingOffer || !session) return;
    const myId = session.user.id;
    const { callId, sdp, type } = incomingOffer;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);

      const pc = createPeerConnection(callId, myId);
      pcRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      subscribeCallChannel(callId, myId);

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; }
      callChannelRef.current?.send({ type: 'broadcast', event: 'answer', payload: { sdp: answer, from: myId } });
      setCallState(prev => prev ? { ...prev, status: 'active' } : prev);
      setIncomingOffer(null);
    } catch (err) {
      console.error(err);
      alert('Could not access camera/microphone.');
      handleDeclineCall();
    }
  };

  const handleDeclineCall = () => {
    if (incomingOffer && session) {
      sendOnce(`call-${incomingOffer.callId}`, 'call-declined', { from: session.user.id });
    }
    endCallCleanup();
  };

  const handleEndCall = () => {
    if (callState && session) {
      callChannelRef.current?.send({ type: 'broadcast', event: 'call-end', payload: { from: session.user.id } });
    }
    endCallCleanup();
  };

  const handleToggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const handleToggleCamera = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
    setIsCameraOff(!isCameraOff);
  };

  useEffect(() => {
    messageAudio.current = new Audio(MESSAGE_SOUND_URL);
    messageAudio.current.volume = 0.3;
    ringtoneRef.current = new Audio(MESSAGE_SOUND_URL);
    ringtoneRef.current.volume = 0.4;
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

  const handleSelectContact = (id: string | 'community' | 'hub') => {
    setActiveContactId(id);
    setView('chat');
    if (isMobileView) setShowSidebar(false);
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

    await supabase.from('posts').insert({
      author_id: userId,
      author_name: `${firstName} ${lastName}`.trim(),
      author_avatar: avatar || DEFAULT_AVATAR,
      content: `${firstName} just linked into the Neural Network. Say hi!`,
      post_type: 'join_announcement',
    });

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
      author_id: session?.user.id,
      author_name: displayName(myProfile),
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
      author_id: session?.user.id,
      author_name: displayName(myProfile),
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

  const handleSaveProfile = async (updates: {
    firstName: string; lastName: string; nickname: string; bio: string;
    school: string; work: string; hobby: string; interests: string;
    isPublic: boolean; avatar?: string;
  }) => {
    if (!session) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        nickname: updates.nickname,
        bio: updates.bio,
        school: updates.school,
        work: updates.work,
        hobby: updates.hobby,
        interests: updates.interests,
        is_public: updates.isPublic,
        avatar: updates.avatar,
      })
      .eq('id', session.user.id);
    if (error) throw error;
    setMyProfile(prev => prev ? {
      ...prev,
      firstName: updates.firstName,
      lastName: updates.lastName,
      username: `${updates.firstName} ${updates.lastName}`.trim(),
      nickname: updates.nickname,
      bio: updates.bio,
      school: updates.school,
      work: updates.work,
      hobby: updates.hobby,
      interests: updates.interests,
      isPublic: updates.isPublic,
      avatar: updates.avatar,
    } : prev);
  };

  const handleAddTestimonial = async (profileId: string, content: string) => {
    const { error } = await supabase.from('testimonials').insert({
      profile_id: profileId,
      author_id: session?.user.id,
      author_name: displayName(myProfile),
      author_avatar: myProfile?.avatar || DEFAULT_AVATAR,
      content,
    });
    if (error) console.error(error);
  };

  const handleSetTestimonialStatus = async (id: string, status: Testimonial['status']) => {
    const { error } = await supabase.from('testimonials').update({ status }).eq('id', id);
    if (error) console.error(error);
  };

  const addConnectionBothWays = async (otherId: string) => {
    if (!session) return;
    const myId = session.user.id;
    const { error } = await supabase
      .from('connections')
      .upsert([
        { user_id: myId, connection_id: otherId },
        { user_id: otherId, connection_id: myId },
      ], { onConflict: 'user_id,connection_id', ignoreDuplicates: true });
    if (error) {
      console.error('[neural-link] failed to create connection:', error);
      alert(`Failed to link: ${error.message}`);
    }
  };

  const handleSendConnectionRequest = async (recipientId: string) => {
    if (!session) return;
    const { error } = await supabase
      .from('connection_requests')
      .upsert({ sender_id: session.user.id, recipient_id: recipientId, status: 'pending' }, { onConflict: 'sender_id,recipient_id' });
    if (error) {
      console.error('[neural-link] failed to send request:', error);
      alert(`Failed to send Neural Link request: ${error.message}`);
    }
  };

  const handleAcceptConnectionRequest = async (requestId: string, otherId: string) => {
    const { error } = await supabase.from('connection_requests').update({ status: 'accepted' }).eq('id', requestId);
    if (error) { console.error(error); return; }
    await addConnectionBothWays(otherId);
  };

  const handleDeclineConnectionRequest = async (requestId: string) => {
    const { error } = await supabase.from('connection_requests').update({ status: 'declined' }).eq('id', requestId);
    if (error) console.error(error);
  };

  const handleCancelConnectionRequest = async (requestId: string) => {
    const { error } = await supabase.from('connection_requests').delete().eq('id', requestId);
    if (error) console.error(error);
  };

  const handleSendDirectMessage = async (recipientId: string, content: string) => {
    if (!session) return;
    const { error } = await supabase.from('messages').insert({
      sender_id: session.user.id,
      recipient_id: recipientId,
      content,
    });
    if (error) console.error(error);
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!session) return;
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('user_id', session.user.id)
      .eq('connection_id', connectionId);
    if (error) console.error(error);
  };

  if (authStatus === 'unauthenticated') {
    return (
      <AuthScreen
        onSignUp={handleSignUp}
        onSignIn={handleSignIn}
      />
    );
  }

  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeMessages = activeContact?.profileId
    ? directMessages.filter(m => m.senderId === activeContact.profileId || m.recipientId === activeContact.profileId)
    : sessions[activeContactId as string] || [];
  const currentUsername = displayName(myProfile);
  const currentAvatar = myProfile?.avatar || DEFAULT_AVATAR;

  const myId = session?.user.id;
  const pendingOutgoing = connectionRequests.filter(r => r.senderId === myId && r.status === 'pending');
  const pendingIncoming = connectionRequests.filter(r => r.recipientId === myId && r.status === 'pending');
  const pendingOutgoingIds = new Set(pendingOutgoing.map(r => r.recipientId));
  const incomingRequestEntries = pendingIncoming
    .map(r => ({ requestId: r.id, profile: users.find(u => u.id === r.senderId) }))
    .filter((e): e is { requestId: string; profile: UserProfile } => !!e.profile);
  const outgoingRequestEntries = pendingOutgoing
    .map(r => ({ requestId: r.id, profile: users.find(u => u.id === r.recipientId) }))
    .filter((e): e is { requestId: string; profile: UserProfile } => !!e.profile);

  return (
    <div className="flex h-[100dvh] w-full bg-[#050000] text-red-50 overflow-hidden relative">
      {showNeuralOverlay && (
        <NeuralBreachOverlay onComplete={() => setShowNeuralOverlay(false)} />
      )}

      {session && !callState && (
        <div className="fixed bottom-1 left-1 z-[150] text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-lime-400 pointer-events-none">
          call-listener: {callListenerStatus}
        </div>
      )}
      {callState?.status === 'calling' && outgoingCallDebug && (
        <div className="fixed top-1 left-1 right-1 z-[250] text-[8px] font-mono px-1.5 py-1 rounded bg-black/70 text-lime-400 break-all">
          {outgoingCallDebug}
        </div>
      )}

      {callState && (
        <CallOverlay
          status={callState.status}
          type={callState.type}
          isCaller={callState.isCaller}
          peerName={callState.peerName}
          peerAvatar={callState.peerAvatar}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onAccept={handleAcceptCall}
          onEnd={callState.status === 'ringing' && !callState.isCaller ? handleDeclineCall : handleEndCall}
        />
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
        />
      )}

      {isNewChatModalOpen && (
        <NewChatModal
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
          authorizedUsers={users}
          onSelectUser={(id, name, avatar) => {
            const newId = `user-${Date.now()}`;
            const newContact: Contact = {
              id: newId, profileId: id, name, avatar,
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
          onOpenNeuralLink={() => { setView('neural-link'); if (isMobileView) setShowSidebar(false); }}
          onViewProfile={handleViewProfile}
          onLogout={async () => {
            await supabase.auth.signOut();
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
            onBack={isMobileView ? () => setShowSidebar(true) : undefined}
          />
        ) : view === 'neural-link' ? (
          <NeuralLink
            connections={users.filter(u => connectedIds.has(u.id))}
            incomingRequests={incomingRequestEntries}
            outgoingRequests={outgoingRequestEntries}
            onViewProfile={handleViewProfile}
            onRemoveConnection={handleRemoveConnection}
            onAcceptRequest={handleAcceptConnectionRequest}
            onDeclineRequest={handleDeclineConnectionRequest}
            onCancelRequest={handleCancelConnectionRequest}
            onBack={isMobileView ? () => setShowSidebar(true) : undefined}
          />
        ) : view === 'profile' ? (
          (() => {
            const profile = users.find(u => u.id === viewingProfileId) || (myProfile?.id === viewingProfileId ? myProfile : null);
            if (!profile) return null;
            const isOwnProfile = session?.user.id === viewingProfileId;
            const incomingReq = pendingIncoming.find(r => r.senderId === profile.id);
            return (
              <ProfileView
                profile={profile}
                posts={posts.filter(p => p.authorId === viewingProfileId)}
                isOwnProfile={isOwnProfile}
                onSave={isOwnProfile ? handleSaveProfile : undefined}
                onBack={() => setView('chat')}
                testimonials={testimonials}
                canSubmitTestimonial={!isOwnProfile && !!session}
                onAddTestimonial={(content) => handleAddTestimonial(profile.id, content)}
                onSetTestimonialStatus={isOwnProfile ? handleSetTestimonialStatus : undefined}
                isConnected={connectedIds.has(profile.id)}
                hasSentRequest={pendingOutgoingIds.has(profile.id)}
                incomingRequestId={incomingReq?.id}
                onSendConnectionRequest={!isOwnProfile && session ? () => handleSendConnectionRequest(profile.id) : undefined}
                onAcceptConnectionRequest={(requestId) => handleAcceptConnectionRequest(requestId, profile.id)}
                onDeclineConnectionRequest={handleDeclineConnectionRequest}
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
            currentUserId={session?.user.id}
            connectedIds={connectedIds}
            pendingRequestIds={pendingOutgoingIds}
            onSendConnectionRequest={handleSendConnectionRequest}
            title="Broadcast"
            emptyMessage="No broadcasts yet."
          />
        ) : activeContactId === 'hub' ? (
          <CommunityTab
            posts={posts.filter(p => p.authorId === session?.user.id || (p.authorId && connectedIds.has(p.authorId)))}
            onAddPost={handleAddPost}
            onLikePost={handleLikePost}
            onCommentPost={handleCommentPost}
            currentUser={{ name: currentUsername, avatar: currentAvatar }}
            onBack={isMobileView ? () => setShowSidebar(true) : undefined}
            onViewProfile={handleViewProfile}
            currentUserId={session?.user.id}
            connectedIds={connectedIds}
            pendingRequestIds={pendingOutgoingIds}
            onSendConnectionRequest={handleSendConnectionRequest}
            title="Neural Hub"
            emptyMessage="Nothing here yet — add people to your Neural Link to see their broadcasts."
          />
        ) : (
          activeContact && (
            <ChatWindow
              contact={activeContact}
              messages={activeMessages}
              onSendMessage={async (text) => {
                const contactId = activeContactId as string;
                if (activeContact.profileId) {
                  await handleSendDirectMessage(activeContact.profileId, text);
                  return;
                }
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
              onViewProfile={handleViewProfile}
              canCall={!!activeContact.profileId && connectedIds.has(activeContact.profileId)}
              onStartCall={(type) => handleStartCall(activeContact, type)}
            />
          )
        )}
      </div>
    </div>
  );
};

export default App;
