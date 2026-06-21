import React, { useState, useRef } from 'react';
import { User, Mail, Lock, ArrowRight, Loader2, BrainCircuit, PlusSquare } from 'lucide-react';
import SpiderLily from './SpiderLily';

interface AuthScreenProps {
  onSignUp: (data: { firstName: string; lastName: string; email: string; password: string; avatar?: string }) => Promise<string | void>;
  onSignIn: (data: { email: string; password: string }) => Promise<string | void>;
  onAdminLogin: (key: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignUp, onSignIn, onAdminLogin }) => {
  const [mode, setMode] = useState<'signup' | 'signin' | 'owner'>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [terminalKey, setTerminalKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (mode === 'owner') {
      onAdminLogin(terminalKey);
      return;
    }

    setLoading(true);
    const result = mode === 'signup'
      ? await onSignUp({ firstName, lastName, email, password, avatar })
      : await onSignIn({ email, password });
    setLoading(false);
    if (result) setMessage(result);
  };

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
          {mode === 'signup' && (
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
            {mode === 'signup' && (
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-red-950" size={18} />
                  <input
                    required
                    type="text"
                    placeholder="First Name"
                    className="w-full bg-[#050000] border border-red-950 rounded-xl py-4 pl-12 pr-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 transition-all font-bold tracking-widest text-sm"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="relative flex-1">
                  <input
                    required
                    type="text"
                    placeholder="Last Name"
                    className="w-full bg-[#050000] border border-red-950 rounded-xl py-4 px-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 transition-all font-bold tracking-widest text-sm"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {mode === 'owner' ? (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-red-950" size={18} />
                <input
                  required
                  type="password"
                  placeholder="Terminal Key"
                  className="w-full bg-[#050000] border border-red-950 rounded-xl py-4 pl-12 pr-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 transition-all font-bold tracking-widest text-sm"
                  value={terminalKey}
                  onChange={(e) => setTerminalKey(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-red-950" size={18} />
                  <input
                    required
                    type="email"
                    placeholder="Email Address"
                    className="w-full bg-[#050000] border border-red-950 rounded-xl py-4 pl-12 pr-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 transition-all font-bold tracking-widest text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-red-950" size={18} />
                  <input
                    required
                    minLength={6}
                    type="password"
                    placeholder="Password"
                    className="w-full bg-[#050000] border border-red-950 rounded-xl py-4 pl-12 pr-4 text-red-50 placeholder-red-950 outline-none focus:ring-1 focus:ring-red-600 transition-all font-bold tracking-widest text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {message && (
            <p className="text-red-500 text-xs font-bold text-center">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-[0_10px_30px_rgba(220,38,38,0.3)]"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <><span>{mode === 'owner' ? 'Override' : mode === 'signup' ? 'Initialize' : 'Reconnect'}</span><ArrowRight size={18}/></>
            )}
          </button>
        </form>

        <div className="flex justify-center space-x-6">
          {mode !== 'owner' && (
            <button
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage(null); }}
              className="text-[10px] font-black text-red-950 hover:text-red-600 transition-colors uppercase tracking-widest border-b border-red-950 pb-1"
            >
              {mode === 'signup' ? 'Already Linked? Sign In' : 'New Subject? Sign Up'}
            </button>
          )}
          <button
            onClick={() => { setMode(mode === 'owner' ? 'signup' : 'owner'); setMessage(null); }}
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
