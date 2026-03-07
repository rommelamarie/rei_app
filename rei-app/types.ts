export interface Post {
  id: string;
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

export type AuthStatus = 'unauthenticated' | 'pending' | 'authenticated' | 'admin';

export interface RegistrationRequest {
  username: string;
  answer: string;
  avatar?: string;
  timestamp: Date;
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  detail: string;
  status: 'success' | 'critical' | 'warning' | 'info';
}
