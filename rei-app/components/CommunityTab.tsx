import React, { useState, useRef } from 'react';
import { Post, Comment } from '../types';
import { Image, Video, Send, Heart, Share2, MoreHorizontal, Clock, X, Camera, ChevronLeft, Check, MessageSquare, Sparkles, Loader2, Wand2, ShieldAlert, Link2, UserPlus } from 'lucide-react';
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
  currentUserId?: string;
  connectedIds?: Set<string>;
  onAddConnection?: (userId: string) => void;
  title?: string;
  emptyMessage?: string;
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
  onViewProfile,
  currentUserId,
  connectedIds = new Set(),
  onAddConnection,
  title = 'Community Hub',
  emptyMessage = 'No broadcasts yet.'
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

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  };

  const handleCommentSubmit = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    onCommentPost(postId, text);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
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
            <h2 className="font-black text-red-600 text-xl tracking-tighter uppercase">{title}</h2>
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
          {posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-[#130303]/40 border border-dashed border-red-950 rounded-[3rem]">
              <p className="text-red-900 text-[10px] font-black uppercase tracking-widest text-center px-6">{emptyMessage}</p>
            </div>
          )}
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

              {post.postType === 'join_announcement' && post.authorId && (
                <div className="flex items-center justify-between gap-3 mb-4 p-3 bg-[#0a0101] border border-red-950 rounded-2xl">
                  <p className="text-red-700 text-xs font-bold italic">Have you met in person?</p>
                  {post.authorId === currentUserId ? null : connectedIds.has(post.authorId) ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 text-[10px] font-black uppercase rounded-lg border border-red-900/30">
                      <Link2 size={12} /> Linked
                    </span>
                  ) : (
                    <button
                      onClick={() => onAddConnection?.(post.authorId!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg flex-shrink-0"
                    >
                      <UserPlus size={12} /> Add to Neural Link
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => toggleComments(post.id)}
                className="flex items-center gap-1.5 text-red-700 hover:text-red-500 text-[10px] font-black uppercase tracking-widest pt-1"
              >
                <MessageSquare size={14} />
                {(post.comments?.length || 0) > 0 ? `${post.comments!.length} Comment${post.comments!.length === 1 ? '' : 's'}` : 'Comment'}
              </button>

              {expandedComments.has(post.id) && (
                <div className="mt-4 pt-4 border-t border-red-950/50 space-y-4">
                  {post.comments?.map((comment) => (
                    <div key={comment.id} className="flex items-start space-x-3">
                      <img src={comment.authorAvatar} className="w-7 h-7 rounded-full flex-shrink-0" alt={comment.authorName} />
                      <div className="flex-1 min-w-0 bg-[#0a0101] border border-red-950/50 rounded-2xl px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="font-bold text-red-50 text-xs truncate">{comment.authorName}</h5>
                          <span className="text-[8px] text-red-900 font-black uppercase tracking-widest flex-shrink-0">{format(comment.timestamp, 'HH:mm')}</span>
                        </div>
                        <p className="text-red-200 text-xs mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}

                  <form onSubmit={(e) => handleCommentSubmit(e, post.id)} className="flex items-center space-x-3">
                    <img src={currentUser.avatar} className="w-7 h-7 rounded-full flex-shrink-0" alt="Me" />
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Add a comment..."
                      className="flex-1 bg-[#0a0101] border border-red-950 rounded-full py-2 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={!(commentInputs[post.id] || '').trim()}
                      className="p-2 bg-red-600 text-white rounded-full disabled:opacity-30 flex-shrink-0"
                    >
                      <Send size={14} fill="currentColor" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityTab;