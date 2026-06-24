'use client';

import { useEffect, useState } from 'react';
import {
  PhoneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  NoSymbolIcon,
  SpeakerWaveIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/solid';
import { useCall, type CallPeer } from '@/context/CallContext';
import { useAdaptiveVideoFit } from '@/hooks/useAdaptiveVideoFit';
import { formatCallTimer } from '@/lib/callUtils';

// ── Avatar avec anneaux de pulsation ─────────────────────────────────────────
function CallPeerAvatar({
  peer,
  size = 'lg',
  pulse = false,
}: {
  peer: CallPeer | null;
  size?: 'md' | 'lg';
  pulse?: boolean;
}) {
  const dim = size === 'lg' ? 'h-24 w-24 text-4xl' : 'h-20 w-20 text-3xl';

  const inner = peer?.image ? (
    <img
      src={peer.image}
      alt={peer.display_name}
      className="h-full w-full object-cover"
    />
  ) : (
    <span className="font-semibold text-white">
      {peer?.display_name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  );

  return (
    <div className="relative flex items-center justify-center shrink-0">
      {/* Anneaux animés */}
      {pulse && (
        <>
          <span
            className="absolute rounded-full border border-white/20 animate-ping"
            style={{ inset: '-14px' }}
          />
          <span
            className="absolute rounded-full border border-white/10 animate-ping"
            style={{ inset: '-26px', animationDelay: '0.6s' }}
          />
        </>
      )}
      <div
        className={`${dim} rounded-full overflow-hidden border-2 border-white/25
          bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center
          relative z-10`}
      >
        {inner}
      </div>
    </div>
  );
}

// ── Bouton de contrôle générique ──────────────────────────────────────────────
function CtrlBtn({
  icon: Icon,
  label,
  active = false,
  danger = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`h-12 w-12 rounded-full flex items-center justify-center
        transition-all duration-150 active:scale-90
        backdrop-blur-sm border border-white/15
        ${danger
          ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/30'
          : active
            ? 'bg-red-500/90 border-red-500'
            : 'bg-white/15 hover:bg-white/22'
        }`}
    >
      <Icon className="h-5 w-5 text-white" />
    </button>
  );
}

// ── Barre de contrôles ────────────────────────────────────────────────────────
function CallControls({
  isVideo,
  isMuted,
  isCameraOff,
  toggleMute,
  toggleCamera,
  endCall,
}: {
  isVideo: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  endCall: () => void;
}) {
  return (
    <div className="flex justify-center items-center gap-5">
      <CtrlBtn
        icon={isMuted ? NoSymbolIcon : MicrophoneIcon}
        label="Micro"
        active={isMuted}
        onClick={toggleMute}
      />
      {isVideo && (
        <CtrlBtn
          icon={VideoCameraIcon}
          label="Caméra"
          active={isCameraOff}
          onClick={toggleCamera}
        />
      )}
      {/* Bouton fin d'appel — plus grand, rouge avec glow */}
      <button
        type="button"
        onClick={() => void endCall()}
        aria-label="Raccrocher"
        className="h-14 w-14 rounded-full bg-red-500 flex items-center justify-center
          shadow-lg shadow-red-500/40 active:scale-90 transition-all duration-150
          hover:bg-red-600 border border-red-400/30"
      >
        <PhoneXMarkIcon className="h-7 w-7 text-white" />
      </button>
      <CtrlBtn
        icon={SpeakerWaveIcon}
        label="Haut-parleur"
        onClick={() => {}}
      />
      <CtrlBtn
        icon={EllipsisHorizontalIcon}
        label="Plus d'options"
        onClick={() => {}}
      />
    </div>
  );
}

// ── Timer pill ────────────────────────────────────────────────────────────────
function TimerPill({ seconds }: { seconds: number }) {
  return (
    <span
      className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-sm
        text-white/90 text-sm font-mono tabular-nums tracking-wide
        border border-white/12"
    >
      {formatCallTimer(seconds)}
    </span>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
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
    if (phase !== 'active') { setElapsedSeconds(0); return; }
    const startedAt = Date.now();
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const isVideo = callType === 'video';
  const showActive = phase === 'active' || phase === 'outgoing';
  const remoteVideoFit = useAdaptiveVideoFit(
    remoteVideoRef,
    showActive && isVideo && phase === 'active'
  );

  if (phase === 'idle' && !error) return null;

  // ── Appel vidéo actif / outgoing ─────────────────────────────────────────
  if (showActive && isVideo) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        {/* Flux distant */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 h-full w-full
            ${remoteVideoFit === 'cover' ? 'object-cover' : 'object-contain'}
            ${phase === 'active' ? 'block' : 'hidden'}`}
        />

        {/* Placeholder outgoing */}
        {phase === 'outgoing' && (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center
            text-white px-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            <CallPeerAvatar peer={peer} size="lg" pulse />
            <p className="text-2xl font-semibold mt-6 text-center">{peer?.display_name}</p>
            <p className="text-white/50 text-sm mt-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Sonnerie…
            </p>
          </div>
        )}

        {/* PiP local */}
        <div
          className={`absolute z-[7] overflow-hidden rounded-2xl
            border border-white/20 bg-black shadow-xl
            h-36 w-24 sm:h-44 sm:w-28
            ${isCameraOff ? 'hidden' : 'block'}`}
          style={{
            top: 'max(1rem, env(safe-area-inset-top))',
            right: '1rem',
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover scale-x-[-1]"
          />
        </div>

        {/* Overlay haut */}
        <div
          className="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 pb-16
            bg-gradient-to-b from-black/65 via-black/30 to-transparent"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          {phase === 'active' && <TimerPill seconds={elapsedSeconds} />}
          <p className="text-white text-lg font-semibold drop-shadow">
            {phase === 'outgoing' ? 'En attente de réponse…' : peer?.display_name}
          </p>
        </div>

        {/* Overlay bas — contrôles */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 pt-16 pb-6 px-6
            bg-gradient-to-t from-black/75 via-black/40 to-transparent"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <CallControls
            isVideo
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            toggleMute={toggleMute}
            toggleCamera={toggleCamera}
            endCall={endCall}
          />
        </div>
      </div>
    );
  }

  // ── Appel vocal ou incoming / erreur : carte centrée ─────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4
      bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">

      {/* Toast d'erreur */}
      {error && phase === 'idle' && (
        <div className="absolute top-6 inset-x-4 mx-auto max-w-sm
          rounded-2xl bg-red-500/20 border border-red-400/30
          px-5 py-3 text-red-100 text-sm text-center backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="w-full max-w-xs">

        {/* ── Incoming ─────────────────────────────────────────────────── */}
        {phase === 'incoming' && peer && (
          <div className="text-center text-white flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4 mt-8">
              <CallPeerAvatar peer={peer} size="lg" pulse />
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-1">
                  {isVideo ? 'Appel vidéo entrant' : 'Appel vocal entrant'}
                </p>
                <h2 className="text-2xl font-semibold">{peer.display_name}</h2>
              </div>
            </div>

            <div className="flex justify-center gap-12">
              {/* Refuser */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => void rejectCall()}
                  aria-label="Refuser"
                  className="h-16 w-16 rounded-full bg-red-500 flex items-center justify-center
                    shadow-lg shadow-red-500/30 active:scale-90 transition-all duration-150
                    hover:bg-red-600 border border-red-400/20"
                >
                  <PhoneXMarkIcon className="h-8 w-8 text-white" />
                </button>
                <span className="text-xs text-white/50">Refuser</span>
              </div>

              {/* Accepter */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => void acceptCall()}
                  aria-label="Accepter"
                  className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center
                    shadow-lg shadow-green-500/30 active:scale-90 transition-all duration-150
                    hover:bg-green-400 border border-green-400/20 animate-pulse"
                >
                  <PhoneIcon className="h-8 w-8 text-white" />
                </button>
                <span className="text-xs text-white/50">Répondre</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Outgoing / actif vocal ────────────────────────────────────── */}
        {showActive && !isVideo && (
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4 mt-8">
              <CallPeerAvatar peer={peer} size="lg" pulse={phase === 'outgoing'} />
              <div className="text-center">
                <p className="text-xl font-semibold text-white">{peer?.display_name}</p>
                <p className="text-white/50 text-sm mt-2">
                  {phase === 'outgoing' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      Sonnerie…
                    </span>
                  ) : (
                    <TimerPill seconds={elapsedSeconds} />
                  )}
                </p>
              </div>
            </div>

            <CallControls
              isVideo={false}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              toggleMute={toggleMute}
              toggleCamera={toggleCamera}
              endCall={endCall}
            />
          </div>
        )}
      </div>
    </div>
  );
}