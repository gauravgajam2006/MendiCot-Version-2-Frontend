import type { TurnAlertSound } from '@/utils/turnAlerts';

type AudioContextConstructor = new () => AudioContext;
let activeContext: AudioContext | null = null;

const MASTER_GAIN = 0.84;

function context(): AudioContext | null {
  const constructors = globalThis as typeof globalThis & { AudioContext?: AudioContextConstructor; webkitAudioContext?: AudioContextConstructor };
  const Constructor = constructors.AudioContext ?? constructors.webkitAudioContext;
  if (!Constructor) return null;
  activeContext ??= new Constructor();
  return activeContext;
}

function output(audio: AudioContext): GainNode {
  const master = audio.createGain();
  const limiter = audio.createDynamicsCompressor();

  // Leave normal previews comfortably below full scale; the compressor only
  // catches an unexpected peak from overlapping oscillator partials.
  master.gain.setValueAtTime(MASTER_GAIN, audio.currentTime);
  limiter.threshold.setValueAtTime(-12, audio.currentTime);
  limiter.knee.setValueAtTime(8, audio.currentTime);
  limiter.ratio.setValueAtTime(4, audio.currentTime);
  limiter.attack.setValueAtTime(0.003, audio.currentTime);
  limiter.release.setValueAtTime(0.12, audio.currentTime);
  master.connect(limiter).connect(audio.destination);
  return master;
}

function tone(audio: AudioContext, destination: AudioNode, frequency: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine', attack = 0.015) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** Plays one short, locally synthesized alert. Safe to call from a button gesture. */
export async function playTurnAlertSound(sound: TurnAlertSound): Promise<void> {
  try {
    const audio = context();
    if (!audio) return;
    if (audio.state === 'suspended') await audio.resume();
    const start = audio.currentTime + 0.01;
    const master = output(audio);
    if (sound === 'wooden-click') {
      // Faster attack plus a modest upper partial gives this short sound more
      // presence without making it a harsh electronic beep.
      tone(audio, master, 185, start, 0.075, 0.225, 'triangle', 0.004);
      tone(audio, master, 112, start, 0.06, 0.1125, 'sine', 0.005);
      tone(audio, master, 370, start, 0.045, 0.04, 'sine', 0.003);
    } else if (sound === 'subtle-bell') {
      tone(audio, master, 880, start, 0.48, 0.143);
      tone(audio, master, 1320, start + 0.012, 0.38, 0.0625);
    } else {
      tone(audio, master, 659.25, start, 0.24, 0.125);
      tone(audio, master, 987.77, start + 0.035, 0.2, 0.0625);
    }
  } catch {
    // A browser may reject audio playback; previews should never disrupt the table UI.
  }
}