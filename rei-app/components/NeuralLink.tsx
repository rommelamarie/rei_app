import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ChevronLeft, UserMinus, Link2, Check, X } from 'lucide-react';
import SpiderLily from './SpiderLily';

interface RequestEntry {
  requestId: string;
  profile: UserProfile;
}

interface NeuralLinkProps {
  connections: UserProfile[];
  incomingRequests?: RequestEntry[];
  outgoingRequests?: RequestEntry[];
  onViewProfile?: (id: string) => void;
  onRemoveConnection?: (id: string) => void;
  onAcceptRequest?: (requestId: string, otherId: string) => void;
  onDeclineRequest?: (requestId: string) => void;
  onCancelRequest?: (requestId: string) => void;
  onBack?: () => void;
}

const NeuralLink: React.FC<NeuralLinkProps> = ({
  connections, incomingRequests = [], outgoingRequests = [],
  onViewProfile, onRemoveConnection, onAcceptRequest, onDeclineRequest, onCancelRequest, onBack,
}) => {
  const [tab, setTab] = useState<'linked' | 'requests'>('linked');

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
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10 custom-scrollbar">
        <div className="flex gap-2 max-w-3xl mx-auto mb-6">
          <button
            onClick={() => setTab('linked')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              tab === 'linked' ? 'bg-red-600 text-white border-red-600' : 'bg-red-950/40 text-red-800 border-red-900/20'
            }`}
          >
            Linked
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${tab === 'linked' ? 'bg-white/20' : 'bg-red-950'}`}>{connections.length}</span>
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              tab === 'requests' ? 'bg-red-600 text-white border-red-600' : 'bg-red-950/40 text-red-800 border-red-900/20'
            }`}
          >
            Requests
            {incomingRequests.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${tab === 'requests' ? 'bg-white/20' : 'bg-red-600 text-white'}`}>{incomingRequests.length}</span>
            )}
          </button>
        </div>

        {tab === 'linked' ? (
          connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#130303]/40 border border-dashed border-red-950 rounded-[3rem]">
              <Link2 size={24} className="text-red-900 mb-2" />
              <p className="text-red-50 text-lg font-bold uppercase tracking-tighter">No links yet</p>
              <p className="text-red-900 text-[10px] font-black uppercase tracking-widest mt-2 text-center max-w-xs">
                Send a Neural Link request from someone's profile, or from a "New Subject" announcement in the Hub.
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
          )
        ) : (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-3">
              <h3 className="text-red-700 text-[10px] font-black uppercase tracking-widest px-2">Incoming Requests</h3>
              {incomingRequests.length === 0 ? (
                <p className="text-red-900 text-[10px] font-black uppercase tracking-widest px-2">No pending requests.</p>
              ) : (
                incomingRequests.map(({ requestId, profile }) => (
                  <div key={requestId} className="bg-[#130303]/80 border border-red-950 p-5 rounded-[2.5rem] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onViewProfile?.(profile.id)}
                      disabled={!onViewProfile}
                      className="flex items-center space-x-4 text-left disabled:cursor-default flex-1 min-w-0"
                    >
                      <img src={profile.avatar} className="w-12 h-12 rounded-full object-cover border border-red-900/30 flex-shrink-0" alt={profile.username} />
                      <h4 className="text-red-50 font-black text-sm uppercase tracking-tight truncate">{profile.nickname?.trim() || profile.username}</h4>
                    </button>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button onClick={() => onAcceptRequest?.(requestId, profile.id)} className="p-2.5 bg-red-600 text-white rounded-2xl">
                        <Check size={18} />
                      </button>
                      <button onClick={() => onDeclineRequest?.(requestId)} className="p-2.5 bg-red-950/40 text-red-600 rounded-2xl border border-red-900/30">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-red-700 text-[10px] font-black uppercase tracking-widest px-2">Sent Requests</h3>
              {outgoingRequests.length === 0 ? (
                <p className="text-red-900 text-[10px] font-black uppercase tracking-widest px-2">No requests sent.</p>
              ) : (
                outgoingRequests.map(({ requestId, profile }) => (
                  <div key={requestId} className="bg-[#130303]/80 border border-red-950 p-5 rounded-[2.5rem] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onViewProfile?.(profile.id)}
                      disabled={!onViewProfile}
                      className="flex items-center space-x-4 text-left disabled:cursor-default flex-1 min-w-0"
                    >
                      <img src={profile.avatar} className="w-12 h-12 rounded-full object-cover border border-red-900/30 flex-shrink-0" alt={profile.username} />
                      <h4 className="text-red-50 font-black text-sm uppercase tracking-tight truncate">{profile.nickname?.trim() || profile.username}</h4>
                    </button>
                    {onCancelRequest && (
                      <button onClick={() => onCancelRequest(requestId)} className="px-3 py-2 bg-[#1a0505] text-red-800 border border-red-950 rounded-xl text-[10px] font-black uppercase flex-shrink-0 ml-2">
                        Cancel
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NeuralLink;
