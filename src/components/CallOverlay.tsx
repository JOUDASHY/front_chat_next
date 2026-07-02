'use client';

import { useEffect, useState } from 'react';
import {
  PhoneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  NoSymbolIcon,
  SpeakerWaveIcon,
  XMarkIcon,
  EllipsisHorizontalIcon,
  UsersIcon,
} from '@heroicons/react/24/solid';
import { useCall, type CallPeer } from '@/context/CallContext';
import { useAdaptiveVideoFit } from '@/hooks/useAdaptiveVideoFit';
import { formatCallTimer } from '@/lib/callUtils';
import { Capacitor } from '@capacitor/core';

function CallPeerAvatar({
  peer,
  size = 'lg',
  pulse = false,
}: {
  peer: CallPeer | null;
  size?: 'md' | 'lg';
  pulse?: boolean;
}) {
  const dim = size === 'lg' ? 'h-24 w-24 text-4xl' : 'h-14 w-14 text-xl';

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

function DeviceSettingsModal({
  onClose,
  audioInputDevices,
  audioOutputDevices,
  activeAudioInput,
  activeAudioOutput,
  switchDevice
}: {
  onClose: () => void;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  activeAudioInput: string | null;
  activeAudioOutput: string | null;
  switchDevice: (kind: 'audioinput' | 'audiooutput', deviceId: string) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-5 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-white font-semibold text-lg">Périphériques</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {audioOutputDevices.length > 0 && (
          <div className="mb-5">
            <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Sortie Audio</label>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {audioOutputDevices.map(d => (
                <button
                  key={d.deviceId}
                  onClick={() => switchDevice('audiooutput', d.deviceId)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm transition-colors truncate ${
                    activeAudioOutput === d.deviceId ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {d.label || 'Haut-parleur par défaut'}
                </button>
              ))}
            </div>
          </div>
        )}

        {audioInputDevices.length > 0 && (
          <div>
            <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Microphone</label>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {audioInputDevices.map(d => (
                <button
                  key={d.deviceId}
                  onClick={() => switchDevice('audioinput', d.deviceId)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm transition-colors truncate ${
                    activeAudioInput === d.deviceId ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {d.label || 'Microphone par défaut'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const {
    audioInputDevices,
    audioOutputDevices,
    activeAudioInput,
    activeAudioOutput,
    switchDevice
  } = useCall();
  const [showSettings, setShowSettings] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const handleSpeakerToggle = async () => {
    if (isNative) {
      const newState = !isSpeakerOn;
      setIsSpeakerOn(newState);
      await switchDevice('audiooutput', newState ? 'speaker' : 'earpiece');
    } else {
      setShowSettings(true);
    }
  };

  return (
    <>
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
        active={isNative ? isSpeakerOn : false}
        onClick={handleSpeakerToggle}
      />
      {!isNative && (
        <CtrlBtn
          icon={EllipsisHorizontalIcon}
          label="Plus d'options"
          onClick={() => setShowSettings(true)}
        />
      )}
    </div>
    {showSettings && (
      <DeviceSettingsModal
        onClose={() => setShowSettings(false)}
        audioInputDevices={audioInputDevices}
        audioOutputDevices={audioOutputDevices}
        activeAudioInput={activeAudioInput}
        activeAudioOutput={activeAudioOutput}
        switchDevice={switchDevice}
      />
    )}
    </>
  );
}

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

function GroupParticipantTile({
  peer,
  videoRef,
  isLocal = false,
  isCameraOff = false,
}: {
  peer: CallPeer;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isLocal?: boolean;
  isCameraOff?: boolean;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center min-h-[140px]">
      {!isCameraOff && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`absolute inset-0 h-full w-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      )}
      {isCameraOff && (
        <div className="flex flex-col items-center gap-2 z-10">
          <CallPeerAvatar peer={peer} size="md" />
        </div>
      )}
      <span className="absolute bottom-2 left-2 z-10 text-[10px] text-white/80 bg-black/45 px-2 py-0.5 rounded-full truncate max-w-[80%]">
        {isLocal ? 'Moi' : peer.display_name}
      </span>
    </div>
  );
}

export default function CallOverlay() {
  const {
    phase,
    callType,
    peer,
    peers,
    error,
    isGroupCall,
    acceptCall,
    rejectCall,
    endCall,
    localVideoRef,
    remoteVideoRef,
    connectedPeers,
    getRemoteVideoRef,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
  } = useCall();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const localUser = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') || '{}') as { id?: number; username?: string }
    : {};

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
    showActive && isVideo && phase === 'active' && !isGroupCall
  );

  // Build participant list for non-video / incoming UI
  const allParticipants: CallPeer[] = [];
  if (isGroupCall && peers.length > 0) {
    allParticipants.push(...peers);
  } else if (peer) {
    allParticipants.push(peer);
  }

  const localPeer: CallPeer = {
    id: localUser.id ?? 0,
    display_name: 'Moi',
    username: localUser.username,
    image: null,
  };

  if (phase === 'idle' && !error) return null;

  // ── Group video call grid ──────────────────────────────────────────────
  if (showActive && isVideo && isGroupCall) {
    const remoteTiles = connectedPeers;
    const tileCount = 1 + remoteTiles.length;
    const gridCols =
      tileCount <= 1 ? 'grid-cols-1'
      : tileCount <= 4 ? 'grid-cols-2'
      : 'grid-cols-3';

    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="flex-1 p-2 overflow-hidden">
          <div className={`grid ${gridCols} gap-2 h-full auto-rows-fr`}>
            <GroupParticipantTile
              peer={localPeer}
              videoRef={localVideoRef}
              isLocal
              isCameraOff={isCameraOff}
            />
            {remoteTiles.map((p) => (
              <GroupParticipantTile
                key={p.id}
                peer={p}
                videoRef={getRemoteVideoRef(p.id)}
              />
            ))}
          </div>
        </div>

        {/* Controls overlay */}
        <div
          className="z-10 pt-4 pb-6 px-6 bg-gradient-to-t from-black/80 to-transparent"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex justify-center mb-3">
            <TimerPill seconds={elapsedSeconds} />
          </div>
          <p className="text-center text-white/70 text-sm mb-3">
            {(() => {
              const count = 1 + remoteTiles.length;
              return `${count} participant${count > 1 ? 's' : ''} connecté${count > 1 ? 's' : ''}`;
            })()}
          </p>
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

  // ── 1-to-1 video call active / outgoing ────────────────────────────────
  if (showActive && isVideo && !isGroupCall) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 h-full w-full
            ${remoteVideoFit === 'cover' ? 'object-cover' : 'object-contain'}
            ${phase === 'active' ? 'block' : 'hidden'}`}
        />

        {/* Remote video placeholder when outgoing */}
        {phase === 'outgoing' && (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-white px-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
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

  // ── Audio call (1-to-1 or group) ───────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4
      bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">

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
                  {isGroupCall
                    ? 'Appel de groupe entrant'
                    : isVideo
                      ? 'Appel vidéo entrant'
                      : 'Appel vocal entrant'}
                </p>
                <h2 className="text-2xl font-semibold">
                  {isGroupCall ? `De ${peer.display_name}` : peer.display_name}
                </h2>
                {isGroupCall && peers.length > 0 && (
                  <p className="text-white/40 text-sm mt-1">
                    {peers.length + 1} participants
                  </p>
                )}
              </div>
            </div>

            {/* Participant avatars for group incoming */}
            {isGroupCall && peers.length > 0 && (
              <div className="flex -space-x-3">
                {peers.slice(0, 5).map((p) => (
                  <div key={p.id} className="h-10 w-10 rounded-full border-2 border-slate-800 overflow-hidden bg-blue-600">
                    {p.image ? (
                      <img src={p.image} alt={p.display_name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-white text-xs font-bold">
                        {p.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
                {peers.length > 5 && (
                  <div className="h-10 w-10 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+{peers.length - 5}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center gap-12">
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

        {/* ── Outgoing / actif vocal (1-to-1) ──────────────────────────── */}
        {showActive && !isVideo && !isGroupCall && (
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

        {/* ── Outgoing / actif vocal (group) ───────────────────────────── */}
        {showActive && !isVideo && isGroupCall && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-4 mt-8">
              <div className="flex items-center justify-center">
                <UsersIcon className="h-16 w-16 text-white/60" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-white">Appel de groupe</p>
                <p className="text-white/50 text-sm mt-1">
                  {allParticipants.length + 1} participants
                </p>
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

            {/* Participant list */}
            {phase === 'active' && allParticipants.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 max-w-xs">
                {allParticipants.map((p) => (
                  <div key={p.id} className="flex flex-col items-center gap-1">
                    <CallPeerAvatar peer={p} size="md" />
                    <span className="text-white/60 text-xs truncate max-w-[80px]">
                      {p.display_name}
                    </span>
                  </div>
                ))}
              </div>
            )}

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
