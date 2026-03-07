import React, { useState } from 'react';
import { X, Search, User, MessageSquare, Plus, Check } from 'lucide-react';
import { RegistrationRequest } from '../types';
import SpiderLily from './SpiderLily';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorizedUsers: RegistrationRequest[];
  onSelectUser: (username: string, avatar: string) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, authorizedUsers, onSelectUser }) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredUsers = authorizedUsers.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-[#130303] border border-red-900/40 rounded-[2.5rem] overflow-hidden relative shadow-[0_0_50px_rgba(220,38,38,0.2)] flex flex-col max-h-[80vh]">
        <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-10">
          <SpiderLily size={150} className="text-red-600 rotate-12" />
        </div>
        <div className="px-8 py-6 border-b border-red-950 flex items-center justify-between">
          <div><h2 className="text-xl font-black text-red-50 uppercase tracking-tighter">New Message</h2></div>
          <button onClick={onClose} className="text-red-900"><X size={24} /></button>
        </div>
        <div className="px-8 py-4"><input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#0a0101] border border-red-950 rounded-2xl py-3 px-4 text-red-50" placeholder="Identity Tag..." /></div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          {filteredUsers.map((user) => (
            <button key={user.username} onClick={() => onSelectUser(user.username, user.avatar || '')} className="w-full flex items-center p-3 rounded-2xl hover:bg-red-950/20 text-left">
              <img src={user.avatar || `https://picsum.photos/seed/${user.username}/200`} className="w-12 h-12 rounded-full mr-4" alt={user.username} />
              <div className="flex-1 font-bold text-red-50">{user.username}</div>
              <Plus size={16} className="text-red-600" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;