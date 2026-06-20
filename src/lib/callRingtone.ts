type RingtoneMode = 'incoming' | 'outgoing';

let audioContext: AudioContext | null = null;
let ringIntervalId: number | null = null;
let activeOscillators: OscillatorNode[] = [];
let vibrateIntervalId: number | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function unlockCallAudio(): void {
  if (typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
}

function stopOscillators(): void {
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      /* already stopped */
    }
  });
  activeOscillators = [];
}

function playTone(frequencies: number[], durationMs: number, volume = 0.12): void {
  const ctx = getAudioContext();
  void ctx.resume();

  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  frequencies.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
    activeOscillators.push(osc);
  });

  window.setTimeout(() => {
    gain.disconnect();
  }, durationMs + 50);
}

function playIncomingBurst(): void {
  playTone([440, 480], 900, 0.14);
}

function playOutgoingBurst(): void {
  playTone([480], 1200, 0.1);
}

function startVibrationPattern(): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

  const pattern = [500, 250, 500, 250, 500, 1500];
  navigator.vibrate(pattern);
  vibrateIntervalId = window.setInterval(() => {
    navigator.vibrate(pattern);
  }, 3200);
}

function stopVibration(): void {
  if (vibrateIntervalId !== null) {
    window.clearInterval(vibrateIntervalId);
    vibrateIntervalId = null;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(0);
  }
}

export function startCallRingtone(mode: RingtoneMode): void {
  if (typeof window === 'undefined') return;

  stopCallRingtone();
  unlockCallAudio();

  const playBurst = mode === 'incoming' ? playIncomingBurst : playOutgoingBurst;
  const intervalMs = mode === 'incoming' ? 3000 : 4000;

  playBurst();
  ringIntervalId = window.setInterval(playBurst, intervalMs);

  if (mode === 'incoming') {
    startVibrationPattern();
  }
}

export function stopCallRingtone(): void {
  if (ringIntervalId !== null) {
    window.clearInterval(ringIntervalId);
    ringIntervalId = null;
  }
  stopOscillators();
  stopVibration();
}

if (typeof window !== 'undefined') {
  const unlockOnce = () => unlockCallAudio();
  window.addEventListener('click', unlockOnce, { once: true, passive: true });
  window.addEventListener('touchstart', unlockOnce, { once: true, passive: true });
}
