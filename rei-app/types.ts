export interface Post {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes?: number;
  hasLiked?: boolean;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
}

export type MessageSender = 'user' | 'bot' | 'system';

export interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  imageUrl?: string;
  audioUrl?: string;
  sources?: Array<{ title: string; uri: string }>;
}

export interface Contact {
  id: string;
  profileId?: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastSeen?: string;
  isOnline: boolean;
  type: 'human' | 'ai';
  category: 'direct' | 'group' | 'bot';
}

export interface ChatSession {
  contactId: string;
  messages: Message[];
}

export type AuthStatus = 'unauthenticated' | 'authenticated' | 'admin';

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  nickname?: string;
  bio?: string;
  school?: string;
  work?: string;
  hobby?: string;
  interests?: string;
  isPublic: boolean;
  joinedAt: Date;
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  detail: string;
  status: 'success' | 'critical' | 'warning' | 'info';
}
