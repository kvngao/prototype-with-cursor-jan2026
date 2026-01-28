"use client";

import Link from 'next/link';
import styles from './styles.module.css';
import { useState, useRef, useEffect } from 'react';

export default function MoogSynthPrototype() {
  const [osc1Freq, setOsc1Freq] = useState(440);
  const [osc2Freq, setOsc2Freq] = useState(220);
  const [filterCutoff, setFilterCutoff] = useState(1000);
  const [filterResonance, setFilterResonance] = useState(0);
  const [reverb, setReverb] = useState(0);
  const [delay, setDelay] = useState(0);
  const [attack, setAttack] = useState(0.1);
  const [decay, setDecay] = useState(0.3);
  const [sustain, setSustain] = useState(0.7);
  const [release, setRelease] = useState(0.5);
  const [volume, setVolume] = useState(0.7);
  const [waveform, setWaveform] = useState<'sine' | 'square' | 'sawtooth' | 'triangle'>('sawtooth');
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [activeNotesVersion, setActiveNotesVersion] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<Map<string, OscillatorNode>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const activeNotesRef = useRef<Map<string, number>>(new Map());
  const convolverRef = useRef<ConvolverNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);

  // Generate waveform visualization
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawWaveform = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const activeNoteFrequencies = Array.from(activeNotesRef.current.values());
      const shouldVisualize = activeNoteFrequencies.length > 0;

      if (!shouldVisualize) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      // Draw grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = (canvas.height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw waveform
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      // More samples + smoothing makes the scope feel more "analog"
      const samples = 900;
      const time = Date.now() * 0.001;

      // If no keys are currently pressed but the user toggled PLAY,
      // use OSC1 frequency as a simple "drone" for the scope.
      const scopeFrequencies =
        activeNoteFrequencies.length > 0 ? activeNoteFrequencies : [osc1Freq];
      
      // Precompute raw samples so we can smooth them
      const raw: number[] = new Array(samples + 1);
      for (let i = 0; i <= samples; i++) {
        // Mix all currently active notes (simple additive synthesis)
        let y = 0;
        for (const freq of scopeFrequencies) {
          const t = (i / samples) * Math.PI * 4 + time * freq * 0.01;

          let sample = 0;
          switch (waveform) {
            case 'sine':
              sample = Math.sin(t);
              break;
            case 'square':
              sample = Math.sign(Math.sin(t));
              break;
            case 'sawtooth':
              sample = 2 * ((t / (2 * Math.PI)) % 1) - 1;
              break;
            case 'triangle':
              sample = 2 * Math.abs(2 * ((t / (2 * Math.PI)) % 1) - 1) - 1;
              break;
            default:
              sample = Math.sin(t);
          }

          y += sample;
        }

        // Normalize so multiple notes don't clip the scope
        y /= Math.max(1, scopeFrequencies.length);

        // Apply filter effect (simplified)
        const filterEffect = Math.max(0, 1 - (filterCutoff / 5000));
        y *= (1 - filterEffect * 0.5);

        raw[i] = y;
      }

      // Smooth with a small moving-average window.
      // This intentionally rounds off sharp edges so the scope reads more like an analog sine.
      const windowSize = 6; // higher = smoother
      const smoothed: number[] = new Array(samples + 1);
      for (let i = 0; i <= samples; i++) {
        let sum = 0;
        let count = 0;
        for (let k = -windowSize; k <= windowSize; k++) {
          const idx = i + k;
          if (idx >= 0 && idx <= samples) {
            sum += raw[idx];
            count++;
          }
        }
        smoothed[i] = sum / Math.max(1, count);
      }

      // Draw using a quadratic curve for additional smoothness
      const toCanvasY = (y: number) =>
        (canvas.height / 2) + (y * (canvas.height / 2) * 0.8);

      const x0 = 0;
      const y0 = toCanvasY(smoothed[0]);
      ctx.moveTo(x0, y0);

      for (let i = 1; i < samples; i++) {
        const x = (canvas.width / samples) * i;
        const y = toCanvasY(smoothed[i]);
        const xNext = (canvas.width / samples) * (i + 1);
        const yNext = toCanvasY(smoothed[i + 1]);

        // Control point at current sample, end point halfway to next sample
        ctx.quadraticCurveTo(x, y, (x + xNext) / 2, (y + yNext) / 2);
      }

      // Final segment to the last point
      const xLast = canvas.width;
      const yLast = toCanvasY(smoothed[samples]);
      ctx.lineTo(xLast, yLast);
      
      ctx.stroke();
      
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [osc1Freq, waveform, filterCutoff, activeNotesVersion]);

  // Initialize Audio Context and effects
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create reverb convolver (impulse response simulation)
      const convolver = audioContext.createConvolver();
      const bufferLength = audioContext.sampleRate * 2;
      const impulse = audioContext.createBuffer(2, bufferLength, audioContext.sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < bufferLength; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferLength, 1.5);
        }
      }
      
      convolver.buffer = impulse;
      convolverRef.current = convolver;

      // Create delay effect
      const delayNode = audioContext.createDelay(1.0);
      delayNode.delayTime.value = 0.3;
      delayNodeRef.current = delayNode;

      const delayGain = audioContext.createGain();
      delayGain.gain.value = 0;
      delayGainRef.current = delayGain;

      // Connect delay feedback loop
      delayNode.connect(delayGain);
      delayGain.connect(delayNode);
    }

    return () => {
      // Cleanup: stop all oscillators
      oscillatorsRef.current.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      oscillatorsRef.current.clear();
      gainNodesRef.current.clear();
    };
  }, []);

  // Update delay time and feedback
  useEffect(() => {
    if (delayNodeRef.current && delayGainRef.current) {
      delayGainRef.current.gain.value = delay / 100 * 0.4; // Max 40% feedback
    }
  }, [delay]);

  // Play note function
  const playNote = (frequency: number, note: string) => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    
    // Resume audio context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Create oscillator
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filterNode = audioContext.createBiquadFilter();

    // Configure filter
    filterNode.type = 'lowpass';
    filterNode.frequency.value = filterCutoff;
    filterNode.Q.value = filterResonance / 10;

    // Configure oscillator
    oscillator.type = waveform;
    oscillator.frequency.value = frequency;

    // Configure gain envelope (ADSR)
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
    gainNode.gain.setValueAtTime(volume * sustain, now + attack + decay + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, now + attack + decay + 0.1 + release);

    // Connect nodes with effects
    oscillator.connect(filterNode);
    
    // Create a merger to combine dry and wet signals
    const merger = audioContext.createChannelMerger(2);
    
    // Dry signal path
    const dryGain = audioContext.createGain();
    dryGain.gain.value = 1 - Math.max(reverb / 100, delay / 100) * 0.3;
    filterNode.connect(dryGain);
    dryGain.connect(merger, 0, 0);
    
    // Reverb path
    if (reverb > 0 && convolverRef.current) {
      const reverbGain = audioContext.createGain();
      reverbGain.gain.value = reverb / 100;
      filterNode.connect(reverbGain);
      reverbGain.connect(convolverRef.current);
      convolverRef.current.connect(merger, 0, 0);
    }
    
    // Delay path
    if (delay > 0 && delayNodeRef.current && delayGainRef.current) {
      const delayInputGain = audioContext.createGain();
      delayInputGain.gain.value = delay / 100;
      filterNode.connect(delayInputGain);
      delayInputGain.connect(delayNodeRef.current);
      
      const delayOutputGain = audioContext.createGain();
      delayOutputGain.gain.value = delay / 100;
      delayNodeRef.current.connect(delayOutputGain);
      delayOutputGain.connect(merger, 0, 0);
    }
    
    // Connect merged signal to gain node
    merger.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start oscillator
    oscillator.start(now);
    oscillator.stop(now + attack + decay + 0.1 + release);

    // Store references
    oscillatorsRef.current.set(note, oscillator);
    gainNodesRef.current.set(note, gainNode);
    activeNotesRef.current.set(note, frequency);
    setActiveNotesVersion((v) => v + 1);

    // Clean up when note ends
    oscillator.onended = () => {
      oscillatorsRef.current.delete(note);
      gainNodesRef.current.delete(note);
      activeNotesRef.current.delete(note);
      setActiveNotesVersion((v) => v + 1);
    };
  };

  // Stop note function
  const stopNote = (note: string) => {
    const gainNode = gainNodesRef.current.get(note);
    if (gainNode && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.linearRampToValueAtTime(0, now + release);
    }
    // For visualization, consider the note released immediately.
    // Audio tail will continue due to envelope release, but the scope shows active keys.
    if (activeNotesRef.current.has(note)) {
      activeNotesRef.current.delete(note);
      setActiveNotesVersion((v) => v + 1);
    }
  };

  // Handle key press
  const handleKeyPress = (note: string, frequency: number) => {
    if (pressedKeys.has(note)) return;
    
    setPressedKeys((prev) => new Set(prev).add(note));
    playNote(frequency, note);
  };

  // Handle key release
  const handleKeyRelease = (note: string) => {
    if (!pressedKeys.has(note)) return;
    
    setPressedKeys((prev) => {
      const newSet = new Set(prev);
      newSet.delete(note);
      return newSet;
    });
    stopNote(note);
  };

  // Keyboard shortcuts (computer keyboard)
  useEffect(() => {
    const keyMap: { [key: string]: { note: string; freq: number } } = {
      'a': { note: 'C4', freq: 261.63 },
      'w': { note: 'C#4', freq: 277.18 },
      's': { note: 'D4', freq: 293.66 },
      'e': { note: 'D#4', freq: 311.13 },
      'd': { note: 'E4', freq: 329.63 },
      'f': { note: 'F4', freq: 349.23 },
      't': { note: 'F#4', freq: 369.99 },
      'g': { note: 'G4', freq: 392.00 },
      'y': { note: 'G#4', freq: 415.30 },
      'h': { note: 'A4', freq: 440.00 },
      'u': { note: 'A#4', freq: 466.16 },
      'j': { note: 'B4', freq: 493.88 },
      'k': { note: 'C5', freq: 523.25 },
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (keyMap[key] && !pressedKeys.has(keyMap[key].note)) {
        handleKeyPress(keyMap[key].note, keyMap[key].freq);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (keyMap[key]) {
        handleKeyRelease(keyMap[key].note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [pressedKeys]);

  // Update filter when parameters change
  useEffect(() => {
    gainNodesRef.current.forEach((gainNode) => {
      // Filter updates are handled in playNote, but we can update active notes
      // For simplicity, we'll let current notes finish and new ones use new settings
    });
  }, [filterCutoff, filterResonance, reverb, delay, waveform, attack, decay, sustain, release, volume]);


  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backButton}>
        ←
      </Link>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>MOOG SYNTHESIZER</h1>
          <p className={styles.subtitle}>Model 80 Digital</p>
        </header>

        <div className={styles.synthPanel}>
          {/* Wood grain panel background effect */}
          <div className={styles.woodGrain}></div>

          {/* Top control panel (inspired by classic Moog layout) */}
          <div className={styles.topPanel}>
            {/* Oscillators Section */}
            <section className={styles.topSection}>
              <h2 className={styles.topSectionTitle}>OSCILLATOR BANK</h2>
              <div className={styles.topSectionBody}>
                <div className={styles.topGroup}>
                  <label className={styles.topLabel}>OSC 1</label>
                  <div className={styles.topKnobs}>
                    <Knob
                      value={osc1Freq}
                      onChange={setOsc1Freq}
                      min={20}
                      max={2000}
                      label="FREQ"
                      unit="Hz"
                    />
                  </div>
                  <div className={styles.waveformSelector}>
                    <button
                      className={`${styles.waveButton} ${waveform === 'sine' ? styles.active : ''}`}
                      onClick={() => setWaveform('sine')}
                    >
                      SINE
                    </button>
                    <button
                      className={`${styles.waveButton} ${waveform === 'square' ? styles.active : ''}`}
                      onClick={() => setWaveform('square')}
                    >
                      SQ
                    </button>
                    <button
                      className={`${styles.waveButton} ${waveform === 'sawtooth' ? styles.active : ''}`}
                      onClick={() => setWaveform('sawtooth')}
                    >
                      SAW
                    </button>
                    <button
                      className={`${styles.waveButton} ${waveform === 'triangle' ? styles.active : ''}`}
                      onClick={() => setWaveform('triangle')}
                    >
                      TRI
                    </button>
                  </div>
                </div>

                <div className={styles.topGroup}>
                  <label className={styles.topLabel}>OSC 2</label>
                  <div className={styles.topKnobs}>
                    <Knob
                      value={osc2Freq}
                      onChange={setOsc2Freq}
                      min={20}
                      max={2000}
                      label="FREQ"
                      unit="Hz"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Filter Section */}
            <section className={styles.topSection}>
              <h2 className={styles.topSectionTitle}>FILTER</h2>
              <div className={styles.topSectionBody}>
                <div className={styles.topKnobs}>
                  <Knob
                    value={filterCutoff}
                    onChange={setFilterCutoff}
                    min={20}
                    max={5000}
                    label="CUTOFF"
                    unit="Hz"
                  />
                  <Knob
                    value={filterResonance}
                    onChange={setFilterResonance}
                    min={0}
                    max={100}
                    label="RES"
                    unit="%"
                  />
                  <Knob
                    value={reverb}
                    onChange={setReverb}
                    min={0}
                    max={100}
                    label="REVERB"
                    unit="%"
                  />
                  <Knob
                    value={delay}
                    onChange={setDelay}
                    min={0}
                    max={100}
                    label="DELAY"
                    unit="%"
                  />
                </div>
              </div>
            </section>

            {/* ADSR Envelope (now knobs) */}
            <section className={styles.topSection}>
              <h2 className={styles.topSectionTitle}>ENVELOPE</h2>
              <div className={styles.topSectionBody}>
                <div className={styles.topKnobs}>
                  <Knob
                    value={attack}
                    onChange={setAttack}
                    min={0}
                    max={2}
                    label="ATTACK"
                    unit="s"
                  />
                  <Knob
                    value={decay}
                    onChange={setDecay}
                    min={0}
                    max={2}
                    label="DECAY"
                    unit="s"
                  />
                  <Knob
                    value={sustain * 100}
                    onChange={(v) => setSustain(v / 100)}
                    min={0}
                    max={100}
                    label="SUSTAIN"
                    unit="%"
                  />
                  <Knob
                    value={release}
                    onChange={setRelease}
                    min={0}
                    max={2}
                    label="RELEASE"
                    unit="s"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Lower panel: output + keyboard + master */}
          <div className={styles.bottomPanel}>
            <section className={styles.bottomLeft}>
              <div className={styles.outputRow}>
                <div className={styles.outputBlock}>
                  <h2 className={styles.bottomTitle}>OUTPUT</h2>
                  <div className={styles.waveformDisplay}>
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={180}
                      className={styles.canvas}
                    />
                  </div>
                </div>

                <div className={styles.masterBlock}>
                  <h2 className={styles.bottomTitle}>MASTER</h2>
                  <div className={styles.masterControls}>
                    <Knob
                      value={volume * 100}
                      onChange={(v) => setVolume(v / 100)}
                      min={0}
                      max={100}
                      label="VOLUME"
                      unit="%"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.bottomRight}>
              <h2 className={styles.bottomTitle}>KEYBOARD</h2>
              <Keyboard
                onKeyPress={handleKeyPress}
                onKeyRelease={handleKeyRelease}
                pressedKeys={pressedKeys}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

// Knob Component
function Knob({
  value,
  onChange,
  min,
  max,
  label,
  unit = '',
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  unit?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const knobRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;
  const rotation = (percentage / 100) * 270 - 135; // -135 to 135 degrees

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startY - e.clientY;
      const range = max - min;
      const change = (deltaY / 100) * range;
      const newValue = Math.max(min, Math.min(max, startValue + change));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, startValue, min, max, onChange]);

  return (
    <div className={styles.knob} ref={knobRef}>
      <div
        className={styles.knobBody}
        style={{ transform: `rotate(${rotation}deg)` }}
        onMouseDown={handleMouseDown}
      >
        <div className={styles.knobIndicator}></div>
      </div>
      <div className={styles.knobLabel}>{label}</div>
      <div className={styles.knobValue}>
        {Math.round(value)}{unit}
      </div>
    </div>
  );
}

// Keyboard Component
function Keyboard({
  onKeyPress,
  onKeyRelease,
  pressedKeys,
}: {
  onKeyPress: (note: string, frequency: number) => void;
  onKeyRelease: (note: string) => void;
  pressedKeys: Set<string>;
}) {
  const notes = [
    { note: 'C4', freq: 261.63, key: 'A', isSharp: false },
    { note: 'C#4', freq: 277.18, key: 'W', isSharp: true },
    { note: 'D4', freq: 293.66, key: 'S', isSharp: false },
    { note: 'D#4', freq: 311.13, key: 'E', isSharp: true },
    { note: 'E4', freq: 329.63, key: 'D', isSharp: false },
    { note: 'F4', freq: 349.23, key: 'F', isSharp: false },
    { note: 'F#4', freq: 369.99, key: 'T', isSharp: true },
    { note: 'G4', freq: 392.00, key: 'G', isSharp: false },
    { note: 'G#4', freq: 415.30, key: 'Y', isSharp: true },
    { note: 'A4', freq: 440.00, key: 'H', isSharp: false },
    { note: 'A#4', freq: 466.16, key: 'U', isSharp: true },
    { note: 'B4', freq: 493.88, key: 'J', isSharp: false },
    { note: 'C5', freq: 523.25, key: 'K', isSharp: false },
  ];

  const whiteKeys = notes.filter((n) => !n.isSharp);
  const blackKeys = notes.filter((n) => n.isSharp);

  return (
    <div className={styles.keyboard}>
      <div className={styles.whiteKeys}>
        {whiteKeys.map((key) => (
          <button
            key={key.note}
            className={`${styles.whiteKey} ${pressedKeys.has(key.note) ? styles.pressed : ''}`}
            onMouseDown={() => onKeyPress(key.note, key.freq)}
            onMouseUp={() => onKeyRelease(key.note)}
            onMouseLeave={() => onKeyRelease(key.note)}
          >
            <span className={styles.keyLabel}>{key.key}</span>
            <span className={styles.keyNote}>{key.note}</span>
          </button>
        ))}
      </div>
      <div className={styles.blackKeys}>
        {blackKeys.map((key) => (
          <button
            key={key.note}
            className={`${styles.blackKey} ${pressedKeys.has(key.note) ? styles.pressed : ''}`}
            onMouseDown={() => onKeyPress(key.note, key.freq)}
            onMouseUp={() => onKeyRelease(key.note)}
            onMouseLeave={() => onKeyRelease(key.note)}
          >
            <span className={styles.keyLabel}>{key.key}</span>
            <span className={styles.keyNote}>{key.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
