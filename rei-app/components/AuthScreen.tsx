import React, { useState, useRef, useEffect } from 'react';
import { User, ShieldCheck, ArrowRight, Loader2, Key, X, Smartphone, BrainCircuit, PlusSquare } from 'lucide-react';
import SpiderLily from './SpiderLily';

interface AuthScreenProps {
  onRegister: (username: string, answer: string, avatar?: string) => void;
  status: 'unauthenticated' | 'pending';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onRegister, status }) => {
  const [username, setUsername] = useState('');
  const [answer, setAnswer] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'friend' | 'owner'>('friend');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onRegister(username, answer, avatar);
      setLoading(false);
    }, 1000);
  };

  if (status === 'pending') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050000] p-6 text-center overflow-hidden">
        <SpiderLily size="150vw" className="absolute text-red-900 blur-3xl animate-neural-glow opacity-[0.05]" />
        <div className="relative z-10 max-w-sm w-full space-y-8 animate-in fade-in zoom-in duration-1000">
          <div className="p-8 rounded-full bg-red-600/10 text-red-500 border border-red-600/20 inline-block shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-neural-glow">
            <ShieldCheck size={64} />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-red-50 uppercase tracking-tighter">Link Pending</h1>
            <p className="text-red-900 text-xs font-black uppercase tracking-[0.3em] leading-relaxed">
              Subject identified as <span className="text-red-500">"{localStorage.getItem('rei_pending_user')}"</span>. Core sync in progress.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-red-500 transition-all"
          >
            Recheck Handshake
          </button>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="text-red-950 hover:text-red-700 text-[10px] font-black uppercase tracking-[0.5em] transition-colors"
          >
            Terminate Identity
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050000] p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(153,27,27,0.1),transparent_70%)] animate-pulse" />
      
      <div className="max-w-md w-full space-y-12 relative animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <div className="text-center flex flex-col items-center">
          <SpiderLily size={120} className="mb-4 animate-neural-glow" />
          <h1 className="text-6xl font-black tracking-tighter text-red-600 uppercase italic">REI</h1>
          <p className="text-red-950 text-[10px] uppercase tracking-[0.6em] font-black mt-2">Neural Link Hub</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-[#0a0101] border border-red-950 p-8 rounded-[2rem] shadow-2xl relative">
          {mode === 'friend' && (
            <div className="flex flex-col items-center space-y-4 mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-[1.5rem] border border-red-900/40 overflow-hidden bg-red-950/20 flex items-center justify-center">
                  {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : <BrainCircuit className="text-red-900/40" size={40} />}
                </div>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-2.5 bg-red-600 text-white rounded-xl shadow-xl active:scale-90"
                >
                  <PlusSquare size={16} />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-red-950" size={18} />
              <input 
                required
                type={mode === 'owner' ? "password" : "text"}
                placeholder={mode === 'owner' ? "Terminal Key" : "Subject Name"}
                className="w-full bg-[#050000] border border-red-950 rounded-xl py-4 pl-12 pr-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 transition-all font-bold tracking-widest text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {mode === 'friend' && (
              <textarea 
                required
                placeholder="Synchronization intent..."
                className="w-full bg-[#050000] border border-red-950 rounded-xl py-4 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 transition-all font-medium text-xs h-24 resize-none"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-[0_10px_30px_rgba(220,38,38,0.3)]"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <><span>{mode === 'owner' ? 'Override' : 'Initialize'}</span><ArrowRight size={18}/></>
            )}
          </button>
        </form>

        <div className="flex justify-center space-x-6">
          <button 
            onClick={() => setMode(mode === 'friend' ? 'owner' : 'friend')}
            className="text-[10px] font-black text-red-950 hover:text-red-600 transition-colors uppercase tracking-widest border-b border-red-950 pb-1"
          >
            {mode === 'owner' ? 'Identity Mode' : 'Terminal Mode'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;