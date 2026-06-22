import React, { useState, useRef } from 'react';
import { UserProfile, Post, Testimonial } from '../types';
import { ChevronLeft, Camera, Pencil, Save, Check, X, Loader2, Lock, Eye, EyeOff, Quote, Archive } from 'lucide-react';
import { format } from 'date-fns';
import SpiderLily from './SpiderLily';

interface ProfileViewProps {
  profile: UserProfile;
  posts: Post[];
  isOwnProfile: boolean;
  onBack?: () => void;
  onSave?: (updates: {
    firstName: string; lastName: string; nickname: string; bio: string;
    school: string; work: string; hobby: string; interests: string;
    isPublic: boolean; avatar?: string;
  }) => Promise<void>;
  testimonials?: Testimonial[];
  canSubmitTestimonial?: boolean;
  onAddTestimonial?: (content: string) => void | Promise<void>;
  onSetTestimonialStatus?: (id: string, status: Testimonial['status']) => void | Promise<void>;
}

const displayName = (profile: UserProfile) => profile.nickname?.trim() || profile.username;

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

const ProfileView: React.FC<ProfileViewProps> = ({
  profile, posts, isOwnProfile, onBack, onSave,
  testimonials = [], canSubmitTestimonial, onAddTestimonial, onSetTestimonialStatus,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [school, setSchool] = useState(profile.school || '');
  const [work, setWork] = useState(profile.work || '');
  const [hobby, setHobby] = useState(profile.hobby || '');
  const [interests, setInterests] = useState(profile.interests || '');
  const [isPublic, setIsPublic] = useState(profile.isPublic);
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
    setNickname(profile.nickname || '');
    setBio(profile.bio || '');
    setSchool(profile.school || '');
    setWork(profile.work || '');
    setHobby(profile.hobby || '');
    setInterests(profile.interests || '');
    setIsPublic(profile.isPublic);
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
      await onSave({ firstName, lastName, nickname, bio, school, work, hobby, interests, isPublic, avatar });
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
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nickname (shown on profile & broadcasts instead of your name)"
                maxLength={40}
                className="w-full bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm font-bold"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Synchronization intent... (bio)"
                maxLength={280}
                className="w-full bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm h-24 resize-none"
              />
              <div className="flex gap-3">
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="School"
                  className="flex-1 bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm"
                />
                <input
                  value={work}
                  onChange={(e) => setWork(e.target.value)}
                  placeholder="Work"
                  className="flex-1 bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm"
                />
              </div>
              <input
                value={hobby}
                onChange={(e) => setHobby(e.target.value)}
                placeholder="Hobby"
                className="w-full bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm"
              />
              <input
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="Interests"
                className="w-full bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm"
              />
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className="w-full flex items-center justify-between bg-[#050000] border border-red-950 rounded-xl py-3 px-4"
              >
                <span className="flex items-center gap-2 text-red-50 text-sm font-bold">
                  {isPublic ? <Eye size={16} className="text-red-500" /> : <EyeOff size={16} className="text-red-800" />}
                  Allow others to view my profile
                </span>
                <span className={`w-11 h-6 rounded-full relative transition-colors ${isPublic ? 'bg-red-600' : 'bg-red-950'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isPublic ? 'translate-x-5' : ''}`} />
                </span>
              </button>
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
              <img src={profile.avatar} className="w-24 h-24 rounded-full border-2 border-red-600 p-1 object-cover mb-4" alt={displayName(profile)} />
              <h3 className="text-2xl font-black text-red-50 tracking-tighter uppercase">{displayName(profile)}</h3>
              {profile.nickname && (
                <p className="text-red-800 text-xs font-bold">{profile.username}</p>
              )}
              <p className="text-[10px] text-red-900 font-black uppercase tracking-widest mt-1">
                Member since {format(profile.joinedAt, 'MMMM yyyy')}
              </p>

              {!isOwnProfile && !profile.isPublic ? (
                <div className="flex flex-col items-center mt-6 py-8 px-4 bg-[#0a0101] border border-dashed border-red-950 rounded-[2rem] w-full max-w-md">
                  <Lock size={24} className="text-red-800 mb-2" />
                  <p className="text-red-700 text-xs font-black uppercase tracking-widest">This profile is private</p>
                </div>
              ) : (
                <>
                  {profile.bio && <p className="text-red-200 text-sm mt-4 max-w-md">{profile.bio}</p>}
                  {(profile.school || profile.work || profile.hobby || profile.interests) && (
                    <div className="grid grid-cols-2 gap-3 mt-5 w-full max-w-md text-left">
                      {profile.school && <ProfileFact label="School" value={profile.school} />}
                      {profile.work && <ProfileFact label="Work" value={profile.work} />}
                      {profile.hobby && <ProfileFact label="Hobby" value={profile.hobby} />}
                      {profile.interests && <ProfileFact label="Interests" value={profile.interests} />}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {(isOwnProfile || profile.isPublic) && (
          <TestimonialsSection
            profileName={displayName(profile)}
            isOwnProfile={isOwnProfile}
            testimonials={testimonials}
            canSubmit={!!canSubmitTestimonial}
            onAddTestimonial={onAddTestimonial}
            onSetStatus={onSetTestimonialStatus}
          />
        )}

        {(isOwnProfile || profile.isPublic) && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h4 className="text-red-700 text-[10px] font-black uppercase tracking-widest px-2">
              {isOwnProfile ? 'Your Broadcasts' : `${displayName(profile)}'s Broadcasts`}
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
        )}
      </div>
    </div>
  );
};

interface TestimonialsSectionProps {
  profileName: string;
  isOwnProfile: boolean;
  testimonials: Testimonial[];
  canSubmit: boolean;
  onAddTestimonial?: (content: string) => void | Promise<void>;
  onSetStatus?: (id: string, status: Testimonial['status']) => void | Promise<void>;
}

const TESTIMONIAL_TABS: Testimonial['status'][] = ['pending', 'approved', 'denied', 'archived'];

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  profileName, isOwnProfile, testimonials, canSubmit, onAddTestimonial, onSetStatus,
}) => {
  const [content, setContent] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [tab, setTab] = useState<Testimonial['status']>('pending');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !onAddTestimonial) return;
    setSubmitStatus('submitting');
    await onAddTestimonial(content.trim());
    setContent('');
    setSubmitStatus('success');
    setTimeout(() => setSubmitStatus('idle'), 1500);
  };

  const visible = isOwnProfile ? testimonials.filter(t => t.status === tab) : testimonials.filter(t => t.status === 'approved');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h4 className="text-red-700 text-[10px] font-black uppercase tracking-widest px-2">Testimonials</h4>

      {canSubmit && (
        <form onSubmit={handleSubmit} className="bg-[#130303]/60 border border-red-950 rounded-[2rem] p-5 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Write a testimonial for ${profileName}...`}
            className="w-full bg-[#050000] border border-red-950 rounded-xl py-3 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 text-sm h-28 resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-red-900 font-black uppercase tracking-widest">Visible once approved by {profileName}</p>
            <button
              type="submit"
              disabled={!content.trim() || submitStatus === 'submitting'}
              className="px-5 py-2 bg-red-600 text-white font-black uppercase text-[10px] rounded-xl disabled:opacity-50"
            >
              {submitStatus === 'submitting' ? 'Submitting...' : submitStatus === 'success' ? 'Submitted' : 'Submit Testimonial'}
            </button>
          </div>
        </form>
      )}

      {isOwnProfile && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TESTIMONIAL_TABS.map((t) => {
            const count = testimonials.filter(x => x.status === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border ${
                  tab === t ? 'bg-red-600 text-white border-red-600' : 'bg-red-950/40 text-red-800 border-red-900/20'
                }`}
              >
                {t}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${tab === t ? 'bg-white/20' : 'bg-red-950'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-[#130303]/40 border border-dashed border-red-950 rounded-[3rem]">
          <Quote size={20} className="text-red-900 mb-2" />
          <p className="text-red-900 text-[10px] font-black uppercase tracking-widest">
            {isOwnProfile ? `No ${tab} testimonials.` : 'No testimonials yet.'}
          </p>
        </div>
      ) : (
        visible.map((t) => (
          <div key={t.id} className="bg-[#130303]/40 border border-red-950/50 rounded-[2.5rem] overflow-hidden p-5 shadow-xl space-y-3">
            <div className="flex items-center space-x-3">
              <img src={t.authorAvatar} className="w-9 h-9 rounded-full object-cover" alt={t.authorName} />
              <div>
                <h5 className="font-bold text-red-50 text-sm">{t.authorName}</h5>
                <p className="text-[9px] text-red-900 font-black uppercase tracking-widest">{format(t.timestamp, 'MMM d, yyyy')}</p>
              </div>
            </div>
            <p className="text-red-100 text-sm whitespace-pre-wrap">{t.content}</p>
            {isOwnProfile && onSetStatus && (
              <div className="flex gap-2 pt-1">
                {t.status === 'pending' && (
                  <>
                    <button onClick={() => onSetStatus(t.id, 'approved')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg">
                      <Check size={12} /> Approve
                    </button>
                    <button onClick={() => onSetStatus(t.id, 'denied')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a0505] text-red-500 border border-red-950 text-[10px] font-black uppercase rounded-lg">
                      <X size={12} /> Deny
                    </button>
                  </>
                )}
                {t.status !== 'archived' && (
                  <button onClick={() => onSetStatus(t.id, 'archived')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a0505] text-red-800 border border-red-950 text-[10px] font-black uppercase rounded-lg">
                    <Archive size={12} /> Archive
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

const ProfileFact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-[#0a0101] border border-red-950 rounded-xl px-3 py-2">
    <p className="text-[9px] text-red-900 font-black uppercase tracking-widest">{label}</p>
    <p className="text-red-100 text-sm font-medium truncate">{value}</p>
  </div>
);

export default ProfileView;
