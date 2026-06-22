import React, { useState, useRef } from 'react';
import { Post, Comment } from '../types';
import { Image, Video, Send, Heart, Share2, MoreHorizontal, Clock, X, Camera, ChevronLeft, Check, MessageSquare, Sparkles, Loader2, Wand2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import SpiderLily from './SpiderLily';

interface CommunityTabProps {
  posts: Post[];
  onAddPost: (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void;
  onLikePost: (postId: string) => void;
  onCommentPost: (postId: string, content: string) => void;
  currentUser: { name: string; avatar: string };
  onBack?: () => void;
  onGenerateText?: (prompt: string) => Promise<string>;
  onGenerateImage?: (prompt: string) => Promise<string | undefined>;
  onMessageUser?: (userName: string, avatar: string) => void;
  onViewProfile?: (userId: string) => void;
}

const CommunityTab: React.FC<CommunityTabProps> = ({ 
  posts, 
  onAddPost, 
  onLikePost, 
  onCommentPost, 
  currentUser, 
  onBack,
  onGenerateText,
  onGenerateImage,
  onMessageUser,
  onViewProfile
}) => {
  const [content, setContent] = useState('');
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview({ url: reader.result as string, type });
      reader.readAsDataURL(file);
    }
  };

  const handleShare = async (post: Post) => {
    const shareText = `[REI Broadcast] ${post.authorName}: "${post.content.slice(0, 60)}..."`;
    if (navigator.share) {
      try { await navigator.share({ title: 'REI Network Broadcast', text: shareText, url: window.location.href }); } catch (err) {}
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      setSharingId(post.id);
      setTimeout(() => setSharingId(null), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaPreview) return;
    onAddPost(content, mediaPreview?.url, mediaPreview?.type);
    setContent('');
    setMediaPreview(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0101] relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.02]">
        <SpiderLily size={700} className="text-red-600 rotate-45" />
      </div>

      <div className="px-4 md:px-6 py-4 border-b border-red-950 bg-[#0a0101]/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center">
          {onBack && <button onClick={onBack} className="mr-3 p-1 text-red-500"><ChevronLeft size={24}/></button>}
          <div>
            <h2 className="font-black text-red-600 text-xl tracking-tighter uppercase">Community Hub</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative z-10 custom-scrollbar">
        <div className="max-w-2xl mx-auto bg-[#130303]/60 border border-red-950 rounded-[2rem] p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex space-x-4">
              <img src={currentUser.avatar} className="w-10 h-10 rounded-full" alt="Me" />
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Synchronize an update..." className="flex-1 bg-transparent border-none text-red-50 placeholder-red-950 resize-none outline-none text-sm min-h-[80px]" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-red-900 hover:text-red-500"><Image size={20}/></button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              </div>
              <button type="submit" className="px-6 py-2 bg-red-600 text-white font-black uppercase text-xs rounded-xl">Broadcast</button>
            </div>
          </form>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-[#130303]/40 border border-red-950/50 rounded-[2.5rem] overflow-hidden p-5 shadow-xl">
              <button
                type="button"
                disabled={!post.authorId || !onViewProfile}
                onClick={() => post.authorId && onViewProfile?.(post.authorId)}
                className="flex items-center space-x-3 mb-4 text-left disabled:cursor-default"
              >
                <img src={post.authorAvatar} className="w-10 h-10 rounded-full" alt={post.authorName} />
                <div>
                  <h4 className="font-bold text-red-50 text-sm">{post.authorName}</h4>
                  <p className="text-[9px] text-red-900 font-black uppercase tracking-widest">{format(post.timestamp, 'HH:mm')}</p>
                </div>
              </button>
              <p className="text-red-100 text-sm mb-4">{post.content}</p>
              {post.mediaUrl && <img src={post.mediaUrl} className="rounded-2xl w-full mb-4" alt="Media" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityTab;