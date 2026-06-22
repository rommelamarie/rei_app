import React from 'react';
import { UserProfile } from '../types';
import { ChevronLeft, UserMinus, Link2 } from 'lucide-react';
import SpiderLily from './SpiderLily';

interface NeuralLinkProps {
  connections: UserProfile[];
  onViewProfile?: (id: string) => void;
  onRemoveConnection?: (id: string) => void;
  onBack?: () => void;
}

const NeuralLink: React.FC<NeuralLinkProps> = ({ connections, onViewProfile, onRemoveConnection, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-[#0a0101] relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.02]">
        <SpiderLily size={700} className="text-red-600 rotate-45" />
      </div>

      <div className="px-4 md:px-6 py-4 border-b border-red-950 bg-[#0a0101]/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center">
          {onBack && <button onClick={onBack} className="mr-3 p-1 text-red-500"><ChevronLeft size={24} /></button>}
          <h2 className="font-black text-red-600 text-xl tracking-tighter uppercase">Neural Link</h2>
        </div>
        <span className="text-[10px] text-red-900 font-black uppercase tracking-widest">{connections.length} Linked</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10 custom-scrollbar">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#130303]/40 border border-dashed border-red-950 rounded-[3rem]">
            <Link2 size={24} className="text-red-900 mb-2" />
            <p className="text-red-50 text-lg font-bold uppercase tracking-tighter">No links yet</p>
            <p className="text-red-900 text-[10px] font-black uppercase tracking-widest mt-2 text-center max-w-xs">
              Add people to your Neural Link from their profile, or from a "New Subject" announcement in the Hub.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {connections.map((person) => (
              <div key={person.id} className="group bg-[#130303]/80 border border-red-950 p-5 rounded-[2.5rem] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onViewProfile?.(person.id)}
                  disabled={!onViewProfile}
                  className="flex items-center space-x-4 text-left disabled:cursor-default flex-1 min-w-0"
                >
                  <img src={person.avatar} className="w-12 h-12 rounded-full object-cover border border-red-900/30 flex-shrink-0" alt={person.username} />
                  <div className="min-w-0">
                    <h4 className="text-red-50 font-black text-sm uppercase tracking-tight truncate">{person.nickname?.trim() || person.username}</h4>
                    <p className="text-red-800 text-[10px] truncate">{person.email}</p>
                  </div>
                </button>
                {onRemoveConnection && (
                  <button
                    onClick={() => onRemoveConnection(person.id)}
                    title="Remove from Neural Link"
                    className="p-2.5 bg-red-950/40 text-red-600 rounded-2xl border border-red-900/30 flex-shrink-0 ml-2"
                  >
                    <UserMinus size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeuralLink;
