'use client';

// hooks/useNotificationSound.ts
// Joue une sonnerie légère à la réception d'un message.
// Le son est généré via Web Audio API — pas besoin de fichier audio externe.
// Le paramètre sound_enabled est lu depuis localStorage.

const STORAGE_KEY = 'notification_sound_enabled';

/** Retourne true si les sons de notification sont activés (défaut : true) */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const val = localStorage.getItem(STORAGE_KEY);
  return val === null ? true : val === 'true'; // activé par défaut
}

/** Active ou désactive les sons de notification */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

/** Joue une petite sonnerie de message (style WhatsApp/Messenger) */
export function playMessageSound(): void {
  if (!isSoundEnabled()) return;
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // Petite mélodie en deux notes rapides (do + mi)
    const notes = [
      { freq: 880, start: 0,    duration: 0.09 },
      { freq: 1046, start: 0.1, duration: 0.12 },
    ];

    notes.forEach(({ freq, start, duration }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + start);

      // Fade in rapide + fade out pour éviter les clics
      gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
      gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      oscillator.start(ctx.currentTime + start);
      oscillator.stop(ctx.currentTime + start + duration);
    });

    // Fermer le contexte après que les sons soient joués
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // Silently fail — autoplay policy peut bloquer
  }
}

/** Son "vu" — bip doux unique grave (style Messenger) */
export function playReadSound(): void {
  if (!isSoundEnabled()) return;
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
    setTimeout(() => ctx.close(), 400);
  } catch (e) {}
}

/** Son "en train d'écrire" — deux petits tics légers (style Messenger) */
export function playTypingSound(): void {
  if (!isSoundEnabled()) return;
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Deux petits tics très courts et légers
    [0, 0.12].forEach((start) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.055);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.06);
    });

    setTimeout(() => ctx.close(), 400);
  } catch (e) {}
}
