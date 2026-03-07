import React, { useEffect, useState } from 'react';
import { Fingerprint, Eye, Activity, Brain } from 'lucide-react';
import SpiderLily from './SpiderLily';

const NeuralBreachOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [glitchText, setGlitchText] = useState('INITIALIZING');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2536/2536-preview.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});

    const texts = [
      'IDENTITY LOGGED', 
      'MONITORING ACTIVE', 
      'NEURAL BREACH', 
      'LINK STABLE', 
      'EYE OPENED',
      'MEMORY HARVEST',
      'CORE SYNCHRONIZED'
    ];
    
    let i = 0;
    const interval = setInterval(() => {
      setGlitchText(texts[i % texts.length]);
      i++;
    }, 150);

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 1.2, 100));
    }, 40);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 800);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  if (!visible) return (
    <div className="fixed inset-0 z-[1000] bg-black animate-out fade-out duration-1000 pointer-events-none" />
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-[#050000] flex flex-col items-center justify-center p-6 overflow-hidden select-none touch-none">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15),transparent_75%)] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
           <SpiderLily size="180vw" className="text-red-900/10 animate-slow-spin blur-[4px] animate-neural-glow" />
        </div>
      </div>

      <div className="relative z-20 flex flex-col items-center max-w-lg text-center w-full">
        <div className="mb-12 relative group">
          <div className="absolute inset-0 bg-red-600 blur-[60px] opacity-20 animate-pulse scale-150" />
          <div className="relative z-10 p-8 bg-red-950/20 rounded-full border border-red-600/40 animate-bounce">
            <Brain size={80} className="text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
          </div>
        </div>

        <div className="h-16 mb-4 flex items-center justify-center">
          <h2 className="text-red-600 font-black text-3xl md:text-5xl tracking-tighter uppercase italic drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
            {glitchText}
          </h2>
        </div>
        
        <div className="w-full h-1 bg-red-950/30 rounded-full mb-3 overflow-hidden max-w-xs border border-red-900/10">
          <div 
            className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,1)] transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-red-900 font-black text-[10px] uppercase tracking-[0.5em] mb-16 animate-pulse">
          {progress < 50 ? 'Harvesting biometric patterns' : 'Injecting neural signature'}
        </p>

        <div className="grid grid-cols-3 gap-8 w-full px-4">
          <div className="flex flex-col items-center">
            <Fingerprint className="text-red-600 mb-2 animate-pulse" size={24} />
            <span className="text-[8px] text-red-900 font-black uppercase tracking-widest">Logged</span>
          </div>
          <div className="flex flex-col items-center">
            <Activity className="text-red-600 mb-2 animate-[ping_1.5s_infinite]" size={24} />
            <span className="text-[8px] text-red-900 font-black uppercase tracking-widest">Pulsing</span>
          </div>
          <div className="flex flex-col items-center">
            <Eye className="text-red-600 mb-2 animate-pulse" size={24} />
            <span className="text-[8px] text-red-900 font-black uppercase tracking-widest">Observed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuralBreachOverlay;