import React, { useRef, useEffect, useState } from 'react';
import { Contact, Message } from '../types';
import { Phone, Video, Send, ChevronLeft, Check, CheckCheck, X, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { connectToNeuralLink, decodeAudio, decodeAudioData, encodeAudio } from '../services/geminiService';
import SpiderLily from './SpiderLily';

interface ChatWindowProps {
  contact: Contact;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onMarkRead: () => void;
  onBack?: () => void;
  isTyping?: boolean;
  onViewProfile?: (id: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ contact, messages, onSendMessage, onMarkRead, onBack, isTyping, onViewProfile }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const audioCtxRef = useRef<{ input: AudioContext | null; output: AudioContext | null }>({ input: null, output: null });
  const nextStartTimeRef = useRef(0);
  const activeSessionRef = useRef<any>(null);

  useEffect(() => {
    onMarkRead();
  }, [messages.length, onMarkRead]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    let interval: any;
    if (isCalling) interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isCalling]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const startCall = async () => {
    if (contact.type !== 'ai') return alert("Neural link limited to Core entities.");
    setIsCalling(true);
    
    try {
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = { input: inputCtx, output: outputCtx };
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = connectToNeuralLink({
        onMessage: async (message) => {
          const base64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const buffer = await decodeAudioData(decodeAudio(base64), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outputCtx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
          }
        },
        onClose: () => endCall(),
        onError: () => endCall(),
      });

      sessionPromise.then((session) => {
        activeSessionRef.current = session;
        const source = inputCtx.createMediaStreamSource(stream);
        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
        
        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
          
          sessionPromise.then((s) => {
            s.sendRealtimeInput({
              media: { data: encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
            });
          });
        };
        
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputCtx.destination);
      });
    } catch (err) {
      endCall();
    }
  };

  const endCall = () => {
    setIsCalling(false);
    activeSessionRef.current?.close();
    audioCtxRef.current.input?.close();
    audioCtxRef.current.output?.close();
    nextStartTimeRef.current = 0;
  };

  return (
    <div className="flex flex-col h-full bg-[#050000] relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
        <SpiderLily size={500} className="text-red-600 rotate-12 blur-[1px]" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-950 bg-[#0a0101]/90 backdrop-blur-md sticky top-0 z-20 mobile-safe-top">
        <div className="flex items-center min-w-0">
          {onBack && (
            <button onClick={onBack} className="mr-2 p-1 text-red-500 hover:text-red-400 active:scale-90">
              <ChevronLeft size={24} />
            </button>
          )}
          <button
            type="button"
            disabled={!contact.profileId || !onViewProfile}
            onClick={() => contact.profileId && onViewProfile?.(contact.profileId)}
            className="flex items-center min-w-0 text-left disabled:cursor-default"
          >
            <img src={contact.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-red-900/40 mr-3" />
            <div className="truncate">
              <h2 className="font-bold text-red-50 text-base leading-tight uppercase tracking-tight truncate">{contact.name}</h2>
              <p className="text-[9px] text-red-800 font-black uppercase tracking-widest">{contact.type === 'ai' ? 'Core Node' : contact.lastSeen}</p>
            </div>
          </button>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={startCall} className="p-2 text-red-500 hover:bg-red-900/20 rounded-full"><Phone size={20} /></button>
          <button className="p-2 text-red-500 hover:bg-red-900/20 rounded-full"><Video size={20} /></button>
        </div>
      </div>

      {/* Call Overlay */}
      {isCalling && (
        <div className="fixed inset-0 z-50 bg-[#0a0101] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="relative mb-12">
            <img src={contact.avatar} className="w-32 h-32 rounded-full border-2 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)]" alt="" />
            <div className="absolute inset-0 rounded-full border border-red-600 animate-ping opacity-20" />
          </div>
          <h2 className="text-2xl font-black text-red-50 mb-2 uppercase italic">Neural Link</h2>
          <p className="text-red-600 font-mono text-xl mb-16">
            {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
          </p>
          <button onClick={endCall} className="p-6 bg-red-600 text-white rounded-full shadow-2xl shadow-red-900/50 active:scale-90"><X size={32} /></button>
        </div>
      )}

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-10">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-[14px] leading-snug shadow-md ${
                  isUser ? 'bg-red-700 text-white rounded-tr-none' : 'bg-[#1a0505] text-red-50 rounded-tl-none border border-red-950'
                }`}>
                  <p>{msg.text}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-red-900/20">
                      {msg.sources.map((s, idx) => (
                        <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center text-[10px] text-red-400 hover:text-red-300 truncate">
                          <ExternalLink size={10} className="mr-1 flex-shrink-0" /> {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center mt-1 space-x-1.5 px-1">
                  <span className="text-[9px] text-red-900 font-bold uppercase">{format(msg.timestamp, 'HH:mm')}</span>
                  {isUser && (
                    <span className="text-red-800">
                      {msg.status === 'read' ? <CheckCheck size={12} className="text-red-500" /> : <Check size={12} />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#1a0505] border border-red-950 px-4 py-2 rounded-xl flex space-x-1 items-center">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[#0a0101] border-t border-red-950 relative z-10 mobile-safe-bottom">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input 
            type="text" 
            placeholder="Identity verify..."
            className="flex-1 bg-[#130303] border border-red-950 rounded-xl py-2.5 px-4 text-sm text-red-50 outline-none focus:ring-1 focus:ring-red-600 transition-all placeholder-red-950 font-medium"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!inputText.trim()} 
            className="p-2.5 bg-red-600 text-white rounded-full disabled:opacity-20 active:scale-90 transition-transform"
          >
            <Send size={20} fill="currentColor" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;