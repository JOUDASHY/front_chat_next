'use client';

import { useEffect, useState } from 'react';
import {
  PhoneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/solid';
import { useCall, type CallPeer } from '@/context/CallContext';
import { formatCallTimer } from '@/lib/callUtils';

function CallPeerAvatar({
  peer,
  size = 'lg',
}: {
  peer: CallPeer | null;
  size?: 'md' | 'lg';
}) {
  const sizeClasses =
    size === 'lg'
      ? 'h-28 w-28 text-4xl border-4'
      : 'h-24 w-24 text-3xl border-4';

  if (peer?.image) {
    return (
      <div
        className={`${sizeClasses} rounded-full overflow-hidden border-[var(--jaune)] bg-gray-700 shrink-0`}
      >
        <img
          src={peer.image}
          alt={peer.display_name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full border-[var(--jaune)] bg-[var(--blue)] flex items-center justify-center font-bold text-white shrink-0`}
    >
      {peer?.display_name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

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
  const showAvatarPlaceholder = !isVideo || phase === 'outgoing';

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
            <div className="mx-auto">
              <CallPeerAvatar peer={peer} size="md" />
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

              {showAvatarPlaceholder && (
                <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-white px-6">
                  <CallPeerAvatar peer={peer} size="lg" />
                  <p className="text-xl font-semibold mt-4 text-center">{peer?.display_name}</p>
                  <p className="text-white/60 text-sm mt-2 text-center">
                    {phase === 'outgoing' ? (
                      'Sonnerie…'
                    ) : (
                      <span className="font-mono tabular-nums text-base text-white/90">
                        {timerLabel}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 h-full w-full object-cover bg-gray-900 z-[6] ${isVideo && phase === 'active' ? 'block' : 'hidden'}`}
              />
              {isVideo && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-4 right-4 h-28 w-20 rounded-xl object-cover border-2 border-white/30 shadow-lg z-[7]"
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
