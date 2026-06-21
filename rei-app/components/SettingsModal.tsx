import React, { useState, useRef } from 'react';
import { X, Camera, Key, User, Shield, Check, Save, Power, Activity } from 'lucide-react';
import SpiderLily from './SpiderLily';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onToggleStatus: () => void;
  currentUser: {
    username: string;
    avatar: string;
    isAdmin: boolean;
  };
  onUpdateProfile: (updates: { username?: string; avatar?: string; password?: string }) => void | Promise<void>;
  terminalKey: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  isOnline, 
  onToggleStatus, 
  currentUser, 
  onUpdateProfile,
  terminalKey
}) => {
  const [username, setUsername] = useState(currentUser.username);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [password, setPassword] = useState(terminalKey);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      await onUpdateProfile({ username, avatar, password });
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        onClose();
      }, 1000);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err?.message || 'Failed to save changes.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-[#130303] border border-red-900/40 rounded-[2.5rem] overflow-hidden relative shadow-[0_0_50px_rgba(220,38,38,0.2)]">
        <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-10">
          <SpiderLily size={150} className="text-red-600 rotate-12" />
        </div>
        <div className="px-8 py-6 border-b border-red-950 flex items-center justify-between">
          <div><h2 className="text-xl font-black text-red-50 uppercase tracking-tighter">Neural Settings</h2></div>
          <button onClick={onClose} className="text-red-900"><X size={24} /></button>
        </div>
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <img src={avatar} className="w-24 h-24 rounded-full border-2 border-red-600 p-1 mb-4 object-cover" alt="Profile" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-2.5 bg-red-600 text-white rounded-xl shadow-xl active:scale-90"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>
          {saveStatus === 'error' && (
            <p className="text-red-500 text-xs font-bold text-center">{errorMessage}</p>
          )}
          <button
            type="submit"
            disabled={saveStatus === 'saving' || saveStatus === 'success'}
            className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saveStatus === 'saving' && <Save size={18} className="animate-spin" />}
            {saveStatus === 'success' && <Check size={18} />}
            {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'success' ? 'Synced' : 'Commit Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;