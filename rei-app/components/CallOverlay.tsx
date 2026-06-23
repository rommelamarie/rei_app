import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';

export type CallStatus = 'calling' | 'ringing' | 'active';
export type CallType = 'audio' | 'video';

interface CallOverlayProps {
  status: CallStatus;
  type: CallType;
  isCaller: boolean;
  peerName: string;
  peerAvatar: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onAccept?: () => void;
  onEnd: () => void;
}

const CallOverlay: React.FC<CallOverlayProps> = ({
  status, type, isCaller, peerName, peerAvatar,
  localStream, remoteStream, isMuted, isCameraOff,
  onToggleMute, onToggleCamera, onAccept, onEnd,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = React.useState(0);

  // status is included here because the <video>/<audio> elements are only
  // mounted into the DOM once status === 'active'. Without it, this effect
  // can run (and attach the stream) before that element exists, and won't
  // re-fire once it actually mounts since the stream itself hasn't changed.
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream, status]);

  useEffect(() => {
    if (type === 'video' && remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (type === 'audio' && remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream, type, status]);

  useEffect(() => {
    if (status !== 'active') { setDuration(0); return; }
    const interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const statusLabel = status === 'calling' ? `Calling ${peerName}...`
    : status === 'ringing' ? `Incoming ${type === 'video' ? 'Video' : 'Neural'} Call`
    : `${Math.floor(duration / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0101] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay />

      {type === 'video' && status === 'active' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}
      {type === 'video' && status === 'active' && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-6 right-6 w-28 h-40 object-cover rounded-2xl border border-red-900/50 shadow-2xl z-10"
        />
      )}

      <div className={`relative z-10 flex flex-col items-center ${type === 'video' && status === 'active' ? 'mt-auto' : ''}`}>
        {!(type === 'video' && status === 'active') && (
          <div className="relative mb-8">
            <img src={peerAvatar} className="w-32 h-32 rounded-full border-2 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)] object-cover" alt={peerName} />
            {status !== 'active' && <div className="absolute inset-0 rounded-full border border-red-600 animate-ping opacity-20" />}
          </div>
        )}

        {!(type === 'video' && status === 'active') && (
          <h2 className="text-2xl font-black text-red-50 mb-2 uppercase italic">{peerName}</h2>
        )}
        <p className={`font-mono text-lg mb-10 ${type === 'video' && status === 'active' ? 'text-red-200 bg-black/40 px-4 py-1 rounded-full' : 'text-red-600 text-xl'}`}>
          {statusLabel}
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-5 mb-4">
        {status === 'ringing' && !isCaller ? (
          <>
            <button onClick={onEnd} className="p-6 bg-[#1a0505] border border-red-900 text-red-600 rounded-full shadow-2xl active:scale-90">
              <PhoneOff size={28} />
            </button>
            <button onClick={onAccept} className="p-6 bg-red-600 text-white rounded-full shadow-2xl shadow-red-900/50 active:scale-90">
              <Phone size={28} />
            </button>
          </>
        ) : (
          <>
            {status === 'active' && (
              <button onClick={onToggleMute} className={`p-5 rounded-full border active:scale-90 ${isMuted ? 'bg-red-600 text-white border-red-600' : 'bg-[#1a0505] text-red-50 border-red-900'}`}>
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
            )}
            {status === 'active' && type === 'video' && (
              <button onClick={onToggleCamera} className={`p-5 rounded-full border active:scale-90 ${isCameraOff ? 'bg-red-600 text-white border-red-600' : 'bg-[#1a0505] text-red-50 border-red-900'}`}>
                {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}
            <button onClick={onEnd} className="p-6 bg-red-600 text-white rounded-full shadow-2xl shadow-red-900/50 active:scale-90">
              <PhoneOff size={28} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CallOverlay;
