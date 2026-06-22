import React, { useState, useRef } from 'react';
import { UserProfile, Post } from '../types';
import { ChevronLeft, Camera, Pencil, Save, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import SpiderLily from './SpiderLily';

interface ProfileViewProps {
  profile: UserProfile;
  posts: Post[];
  isOwnProfile: boolean;
  onBack?: () => void;
  onSave?: (updates: { firstName: string; lastName: string; bio: string; avatar?: string }) => Promise<void>;
}

const resizeImage = (file: File): Promise<string> => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 512;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
});

const ProfileView: React.FC<ProfileViewProps> = ({ profile, posts, isOwnProfile, onBack, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [bio, setBio] = useState(profile.bio || '');
  const [avatar, setAvatar] = useState(profile.avatar);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatar(await resizeImage(file));
  };

  const startEditing = () => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setBio(profile.bio || '');
    setAvatar(profile.avatar);
    setSaveStatus('idle');
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      await onSave({ firstName, lastName, bio, avatar });
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setIsEditing(false);
      }, 800);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err?.message || 'Failed to save changes.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0101] relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.02]">
        <SpiderLily size={700} className="text-red-600 rotate-45" />
      </div>

      <div className="px-4 md:px-6 py-4 border-b border-red-950 bg-[#0a0101]/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center">
          {onBack && <button onClick={onBack} className="mr-3 p-1 text-red-500"><ChevronLeft size={24} /></button>}
          <h2 className="font-black text-red-600 text-xl tracking-tighter uppercase">Profile</h2>
        </div>
        {isOwnProfile && !isEditing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/40 text-red-500 border border-red-900/30 rounded-xl text-xs font-black uppercase tracking-widest"
          >
            <Pencil size={14} /> Edit Profile
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative z-10 custom-scrollbar">
        <div className="max-w-2xl mx-auto bg-[#130303]/60 border border-red-950 rounded-[2rem] p-6">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img src={avatar} className="w-24 h-24 rounded-full border-2 border-red-600 p-1 object-cover" alt="Profile" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-2.5 bg-red-600 text-white rounded-xl shadow-xl active:scale-90"
                  >
                    <Camera size={16} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
              </div>
              <div className="flex gap-3">
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="flex-1 bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm font-bold"
                />
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="flex-1 bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm font-bold"
                />
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Synchronization intent... (bio)"
                maxLength={280}
                className="w-full bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm h-24 resize-none"
              />
              {saveStatus === 'error' && (
                <p className="text-red-500 text-xs font-bold text-center">{errorMessage}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-[#1a0505] text-red-800 border border-red-950 font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveStatus === 'saving' || saveStatus === 'success'}
                  className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saveStatus === 'saving' && <Loader2 size={16} className="animate-spin" />}
                  {saveStatus === 'success' && <Check size={16} />}
                  {saveStatus === 'idle' || saveStatus === 'error' ? (<><Save size={16} /> Save Changes</>) : saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center">
              <img src={profile.avatar} className="w-24 h-24 rounded-full border-2 border-red-600 p-1 object-cover mb-4" alt={profile.username} />
              <h3 className="text-2xl font-black text-red-50 tracking-tighter uppercase">{profile.username}</h3>
              <p className="text-[10px] text-red-900 font-black uppercase tracking-widest mt-1">
                Member since {format(profile.joinedAt, 'MMMM yyyy')}
              </p>
              {profile.bio && <p className="text-red-200 text-sm mt-4 max-w-md">{profile.bio}</p>}
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <h4 className="text-red-700 text-[10px] font-black uppercase tracking-widest px-2">
            {isOwnProfile ? 'Your Broadcasts' : `${profile.username}'s Broadcasts`}
          </h4>
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-[#130303]/40 border border-dashed border-red-950 rounded-[3rem]">
              <p className="text-red-900 text-[10px] font-black uppercase tracking-widest">No broadcasts yet.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-[#130303]/40 border border-red-950/50 rounded-[2.5rem] overflow-hidden p-5 shadow-xl">
                <p className="text-[9px] text-red-900 font-black uppercase tracking-widest mb-2">{format(post.timestamp, 'MMM d, HH:mm')}</p>
                <p className="text-red-100 text-sm mb-4">{post.content}</p>
                {post.mediaUrl && <img src={post.mediaUrl} className="rounded-2xl w-full" alt="Media" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
