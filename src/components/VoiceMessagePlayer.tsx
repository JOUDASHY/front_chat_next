'use client';

import { useEffect, useRef, useState } from 'react';

interface VoiceMessagePlayerProps {
  src: string;
  isCurrentUser: boolean;
  senderImage?: string | null;
}

const BARS = 30;

function formatDuration(secs: number): string {
  if (!isFinite(secs) || isNaN(secs) || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Decode audio buffer → normalized amplitude per bar */
async function computeWaveform(url: string, bars: number): Promise<number[]> {
  try {
    // Offline context — never touches playback
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    const offlineCtx = new OfflineAudioContext(1, 1, 44100);
    const decoded = await offlineCtx.decodeAudioData(arrayBuf);
    const raw = decoded.getChannelData(0);
    const blockSize = Math.floor(raw.length / bars);
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) sum += raw[start + j] ** 2;
      out.push(Math.sqrt(sum / blockSize));
    }
    const max = Math.max(...out, 0.001);
    return out.map((v) => Math.max(0.1, v / max));
  } catch {
    // Fallback: deterministic pseudo-random from URL chars
    return Array.from({ length: bars }, (_, i) => {
      const c = url.charCodeAt(i % url.length);
      return 0.15 + ((c * 17 + i * 29) % 80) / 100;
    });
  }
}

/** Avatar with automatic fallback to blank profile image */
function AvatarWithFallback({ src }: { src?: string | null }) {
  const [errored, setErrored] = useState(false);
  const imgSrc = !src || errored ? '/default-avatar.svg' : src;
  return (
    <img
      src={imgSrc}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setErrored(true)}
    />
  );
}

export default function VoiceMessagePlayer({
  src,
  isCurrentUser,
  senderImage,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [waveReady, setWaveReady] = useState(false);

  // Load waveform via OfflineAudioContext (never affects playback)
  useEffect(() => {
    let cancelled = false;
    computeWaveform(src, BARS).then((w) => {
      if (!cancelled) { setWaveform(w); setWaveReady(true); }
    });
    return () => { cancelled = true; };
  }, [src]);

  // Plain HTML audio element — no Web Audio API attached to it
  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onMeta = () => { if (isFinite(audio.duration)) setDuration(audio.duration); };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Audio play error:', err);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const filledBars = Math.round(progress * BARS);

  // Theme colors
  const playBg = isCurrentUser
    ? 'bg-white/20 hover:bg-white/30'
    : 'bg-indigo-100 hover:bg-indigo-200';
  const playIcon = isCurrentUser ? 'text-white' : 'text-indigo-600';
  const barActive = isCurrentUser ? 'bg-white' : 'bg-indigo-500';
  const barInactive = isCurrentUser ? 'bg-white/30' : 'bg-gray-300';
  const timeColor = isCurrentUser ? 'text-white/70' : 'text-gray-400';

  return (
    <div className="flex items-center gap-2.5 py-0.5 w-full min-w-[200px] max-w-[260px]">
      {/* Play / Pause */}
      <button
        type="button"
        onClick={() => void togglePlay()}
        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${playBg}`}
        aria-label={isPlaying ? 'Pause' : 'Lire'}
      >
        {isPlaying ? (
          <svg className={`h-4 w-4 ${playIcon}`} fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className={`h-4 w-4 ${playIcon} ml-0.5`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform + timer */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Bars */}
        <div
          className="flex items-end gap-[2px] h-8 cursor-pointer select-none"
          onClick={handleSeek}
          title="Cliquer pour naviguer"
        >
          {waveReady
            ? waveform.map((h, i) => (
                <div
                  key={i}
                  className={`rounded-full flex-shrink-0 transition-colors duration-100 ${
                    i < filledBars ? barActive : barInactive
                  }`}
                  style={{
                    width: 3,
                    height: `${Math.round(Math.min(1, h) * 100)}%`,
                    minHeight: 3,
                  }}
                />
              ))
            : Array.from({ length: BARS }, (_, i) => (
                <div
                  key={i}
                  className={`rounded-full flex-shrink-0 animate-pulse ${barInactive}`}
                  style={{ width: 3, height: '35%' }}
                />
              ))}
        </div>

        {/* Mic icon + Time */}
        <div className="flex items-center gap-1">
          <svg
            className={`h-2.5 w-2.5 shrink-0 ${timeColor}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
          </svg>
          <span className={`text-[10px] font-mono leading-none ${timeColor}`}>
            {currentTime > 0 ? formatDuration(currentTime) : formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Avatar (messages reçus seulement) — fallback image vierge */}
      {!isCurrentUser && (
        <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden bg-gray-200 border border-gray-100">
          <AvatarWithFallback src={senderImage} />
        </div>
      )}
    </div>
  );
}
