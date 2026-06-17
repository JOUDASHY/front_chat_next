'use client';

import { useEffect, useState } from 'react';
import {
  PhoneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/solid';
import { useCall } from '@/context/CallContext';
import { formatCallTimer } from '@/lib/callUtils';

export default function CallOverlay() {
  const {
    phase,
    callType,
    peer,
    error,
    acceptCall,
    rejectCall,
    endCall,
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
  } = useCall();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (phase !== 'active') {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [phase]);

  if (phase === 'idle' && !error) return null;

  const isVideo = callType === 'video';
  const showActive = phase === 'active' || phase === 'outgoing';
  const timerLabel = formatCallTimer(elapsedSeconds);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {error && phase === 'idle' && (
          <div className="mb-4 rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-3 text-red-100 text-sm text-center">
            {error}
          </div>
        )}

        {phase === 'incoming' && peer && (
          <div className="text-center text-white space-y-6">
            <div className="mx-auto h-24 w-24 rounded-full overflow-hidden border-4 border-[var(--jaune)] bg-gray-700">
              {peer.image ? (
                <img src={peer.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-3xl font-bold">
                  {peer.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-white/60">
                {isVideo ? 'Appel vidéo entrant' : 'Appel vocal entrant'}
              </p>
              <h2 className="text-2xl font-bold mt-1">{peer.display_name}</h2>
            </div>
            <div className="flex justify-center gap-6">
              <button
                type="button"
                onClick={() => void rejectCall()}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
                aria-label="Refuser"
              >
                <PhoneXMarkIcon className="h-8 w-8 text-white" />
              </button>
              <button
                type="button"
                onClick={() => void acceptCall()}
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg animate-pulse"
                aria-label="Accepter"
              >
                <PhoneIcon className="h-8 w-8 text-white" />
              </button>
            </div>
          </div>
        )}

        {showActive && (
          <div className="space-y-4">
            <div className="relative aspect-[9/16] max-h-[70vh] mx-auto rounded-2xl overflow-hidden bg-gray-900 border border-white/10">
              {phase === 'active' && (
                <div className="absolute top-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
                  <span className="px-4 py-1.5 rounded-full bg-black/50 text-white text-sm font-mono tabular-nums tracking-wide backdrop-blur-sm">
                    {timerLabel}
                  </span>
                </div>
              )}

              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 h-full w-full object-cover bg-gray-900 ${isVideo ? 'block' : 'hidden'}`}
              />
              {!isVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="h-28 w-28 rounded-full bg-[var(--blue)] flex items-center justify-center text-4xl font-bold mb-4">
                    {peer?.display_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <p className="text-xl font-semibold">{peer?.display_name}</p>
                  <p className="text-white/60 text-sm mt-2">
                    {phase === 'outgoing' ? (
                      'Sonnerie…'
                    ) : (
                      <span className="font-mono tabular-nums text-base text-white/90">{timerLabel}</span>
                    )}
                  </p>
                </div>
              )}
              {isVideo && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-4 right-4 h-28 w-20 rounded-xl object-cover border-2 border-white/30 shadow-lg"
                />
              )}
            </div>

            <div className="text-center text-white/80 text-sm">
              <p>
                {phase === 'outgoing' ? 'En attente de réponse…' : peer?.display_name}
              </p>
            </div>

            <div className="flex justify-center items-center gap-4">
              <button
                type="button"
                onClick={() => void toggleMute()}
                className={`h-12 w-12 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-white/20'}`}
                aria-label="Micro"
              >
                {isMuted ? (
                  <NoSymbolIcon className="h-6 w-6 text-white" />
                ) : (
                  <MicrophoneIcon className="h-6 w-6 text-white" />
                )}
              </button>
              {isVideo && (
                <button
                  type="button"
                  onClick={() => void toggleCamera()}
                  className={`h-12 w-12 rounded-full flex items-center justify-center ${isCameraOff ? 'bg-red-500' : 'bg-white/20'}`}
                  aria-label="Caméra"
                >
                  <VideoCameraIcon className="h-6 w-6 text-white" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void endCall()}
                className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
                aria-label="Raccrocher"
              >
                <PhoneXMarkIcon className="h-7 w-7 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
