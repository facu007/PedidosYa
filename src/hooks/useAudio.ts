import { useApp } from '../context/AppContext';

export const useAudio = () => {
  const { config } = useApp();

  const playTone = (frequency: number, type: OscillatorType, duration: number, startTimeOffset = 0) => {
    if (!config.soundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTimeOffset);

      // Smooth volume fade out to avoid clicks
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime + startTimeOffset);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTimeOffset + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime + startTimeOffset);
      osc.stop(ctx.currentTime + startTimeOffset + duration);
    } catch (e) {
      console.warn('Web Audio API is not supported or was blocked by browser autoplay policy:', e);
    }
  };

  const playSuccess = () => {
    // Pleasant ascending chime: C5 (523Hz) followed by G5 (784Hz)
    playTone(523.25, 'sine', 0.1, 0);
    playTone(783.99, 'sine', 0.25, 0.1);
  };

  const playError = () => {
    // Low alert buzz: 180Hz double beep
    playTone(180, 'sawtooth', 0.15, 0);
    playTone(180, 'sawtooth', 0.15, 0.2);
  };

  const playScan = () => {
    // Modern cash register scan blip: 987Hz (B5) for 80ms
    playTone(987.77, 'sine', 0.08, 0);
  };

  const playWarning = () => {
    // Alert tone: 440Hz -> 330Hz descending slide
    playTone(440, 'triangle', 0.25, 0);
  };

  return {
    playSuccess,
    playError,
    playScan,
    playWarning,
  };
};
