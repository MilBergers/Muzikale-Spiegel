import * as Tone from 'tone';
import { emotionMusicData, emotionScaleNames } from './constants';

export default class AudioEngine {
  constructor(onAudioParamChange, onBeat) {
    this.instruments = {};
    this.effects = {};
    this.activeSequences = [];
    this.masterVolume = null;
    this.musicVolume = null; // New: separate volume for music fade
    this.currentEmotion = 'neutral';
    this.isInitialized = false;
    this.onAudioParamChange = onAudioParamChange;
    this.onBeat = onBeat; // New: callback for beat events
    this.beatCount = 0; // Track beat count
    
    // Bind methods to ensure 'this' context is preserved
    this.initialize = this.initialize.bind(this);
    this.setVolume = this.setVolume.bind(this);
    this.setMusicVolume = this.setMusicVolume.bind(this);
    this.stopAllSequences = this.stopAllSequences.bind(this);
    this.startEmotionMusic = this.startEmotionMusic.bind(this);
    this.changeEmotion = this.changeEmotion.bind(this);
    this.dispose = this.dispose.bind(this);
    this.handleBeat = this.handleBeat.bind(this);
  }

  // Initialize audio system
  async initialize(volume) {
    try {
      // Start the audio context
      await Tone.start();
      
      // Create music volume (for fade in/out)
      this.musicVolume = new Tone.Volume(0).toDestination();
      
      // Create master volume (for user control)
      this.masterVolume = new Tone.Volume(volume).connect(this.musicVolume);
      
      // Create effects
      this.effects = {
        reverb: new Tone.Reverb(3),
        delay: new Tone.PingPongDelay("8n", 0.3),
        chorus: new Tone.Chorus(4, 2.5, 0.5),
        distortion: new Tone.Distortion(0.3),
        filter: new Tone.Filter(1000, "lowpass"),
        phaser: new Tone.Phaser({
          frequency: 0.5,
          octaves: 3,
          baseFrequency: 1000
        }),
        vibrato: new Tone.Vibrato(5, 0.2)
      };
      
      // Wait for reverb to initialize
      await this.effects.reverb.generate();
      
      // Create instruments
      this.instruments = {
        // Main melodic synth
        lead: new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "triangle"
          },
          envelope: {
            attack: 0.05,
            decay: 0.1,
            sustain: 0.3,
            release: 1
          }
        }),
        
        // Bass synth
        bass: new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "sine"
          },
          envelope: {
            attack: 0.1,
            decay: 0.3,
            sustain: 0.8,
            release: 1.5
          }
        }),
        
        // Pad/atmosphere synth
        pad: new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "sine"
          },
          envelope: {
            attack: 1.5,
            decay: 1,
            sustain: 0.8,
            release: 3
          }
        }),
        
        // Kick drum
        kick: new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 4,
          oscillator: {
            type: "sine"
          },
          envelope: {
            attack: 0.001,
            decay: 0.4,
            sustain: 0.01,
            release: 1.4,
            attackCurve: "exponential"
          }
        }),
        
        // Snare drum
        snare: new Tone.NoiseSynth({
          noise: {
            type: "white",
            playbackRate: 3,
          },
          envelope: {
            attack: 0.001,
            decay: 0.2,
            sustain: 0.02,
            release: 0.2
          }
        })
      };
      
      // Connect instruments to effects and master
      // Lead synth gets full effects chain
      this.instruments.lead.chain(
        this.effects.filter,
        this.effects.chorus,
        this.effects.delay,
        this.effects.reverb,
        this.masterVolume
      );
      
      // Bass gets less effects for clarity
      this.instruments.bass.chain(
        this.effects.filter,
        this.effects.reverb,
        this.masterVolume
      );
      
      // Pad gets lots of atmosphere
      this.instruments.pad.chain(
        this.effects.phaser,
        this.effects.chorus,
        this.effects.reverb,
        this.masterVolume
      );
      
      // Kick gets minimal processing
      this.instruments.kick.chain(
        new Tone.Filter(800, "lowpass"),
        this.masterVolume
      );
      
      // Snare gets some character
      this.instruments.snare.chain(
        new Tone.Filter(2000, "highpass"),
        new Tone.Filter(6000, "lowpass"),
        this.effects.distortion,
        this.masterVolume
      );
      
      // Set initial tempo
      Tone.Transport.bpm.value = 100;
      
      // Start transport
      Tone.Transport.start();
      
      // Set initialized flag
      this.isInitialized = true;
      
      // Start with the neutral emotion
      await this.startEmotionMusic('neutral');
      
      return true;
    } catch (error) {
      console.error('Fout bij het initialiseren van audio:', error);
      return false;
    }
  }

  // Set master volume (user control)
  setVolume(value) {
    if (this.masterVolume) {
      this.masterVolume.volume.value = value;
    }
  }

  // Set music volume (for fade in/out when face detected/lost)
  setMusicVolume(value) {
    if (this.musicVolume) {
      // Convert linear 0-1 to decibels with smooth transition
      const dbValue = value <= 0.02 ? -60 : Math.log10(value) * 20;
      // Use longer fade time when fading out (to 2%), shorter when fading in
      const fadeTime = value <= 0.02 ? 2.0 : 0.5;
      this.musicVolume.volume.rampTo(dbValue, fadeTime);
    }
  }

  // Stop all currently playing sequences
  stopAllSequences() {
    try {
      // Stop all active sequences
      this.activeSequences.forEach(seq => {
        if (seq && typeof seq.stop === 'function') {
          seq.stop();
        }
      });
      
      // Clear the active sequences array
      this.activeSequences = [];
      
      // Cancel any scheduled events
      Tone.Transport.cancel();
    } catch (error) {
      console.error('Fout bij het stoppen van sequenties:', error);
    }
  }

  // Create and start sequences for a given emotion
  async startEmotionMusic(emotion) {
    try {
      this.currentEmotion = emotion;
      
      // Get the music data for this emotion
      const musicData = emotionMusicData[emotion] || emotionMusicData.neutral;
      
      // Set the tempo with smooth transition
      Tone.Transport.bpm.rampTo(musicData.tempo, 2);
      
      // Update effect settings
      if (musicData.effects) {
        const effects = musicData.effects;
        if (this.effects.filter) {
          this.effects.filter.frequency.rampTo(effects.filter || 1000, 0.5);
        }
        if (this.effects.reverb) {
          this.effects.reverb.decay = 1 + (effects.reverb || 0.5) * 5;
        }
        if (this.effects.chorus) {
          this.effects.chorus.depth = (effects.chorus || 0.3) * 0.8;
        }
        if (this.effects.delay) {
          this.effects.delay.feedback.value = effects.delay || 0.3;
        }
        if (this.effects.distortion) {
          this.effects.distortion.distortion = effects.distortion || 0.2;
        }
        if (this.effects.phaser) {
          this.effects.phaser.octaves = (effects.phaser || 0.3) * 5 + 1;
        }
      }
      
      // Update synth settings
      if (musicData.synth && this.instruments.lead) {
        this.instruments.lead.set({
          oscillator: {
            type: musicData.synth.oscillator || "triangle"
          }
        });
      }
      
      // Create melody pattern based on the scale
      const melodyPattern = [];
      for (let i = 0; i < 8; i++) {
        if (i % 4 === 3) {
          melodyPattern.push(null); // Rest every 4th beat
        } else {
          const noteIndex = Math.floor(Math.random() * musicData.scale.length);
          melodyPattern.push(noteIndex);
        }
      }
      
      // Stop all currently playing sequences
      this.stopAllSequences();
      
      // Create lead melody sequence with beat triggers
      const leadSequence = new Tone.Sequence((time, idx) => {
        if (idx !== null) {
          const note = musicData.scale[idx % musicData.scale.length];
          const velocity = this.getEmotionalVelocity(emotion);
          this.instruments.lead.triggerAttackRelease(note, "8n", time, velocity);
          
          // Trigger particle beat on melody notes
          if (idx % 2 === 0) { // Every other note
            Tone.Draw.schedule(() => {
              this.handleBeat('melody', velocity);
            }, time);
          }
        }
      }, melodyPattern, "8n");
      
      // Create bass sequence
      const bassSequence = new Tone.Sequence((time, note) => {
        if (note !== null) {
          const velocity = this.getEmotionalVelocity(emotion, 'bass');
          this.instruments.bass.triggerAttackRelease(note, "4n", time, velocity);
        }
      }, musicData.bassNotes, "2n");
      
      // Create chord/pad sequence
      const padSequence = new Tone.Sequence((time, chord) => {
        if (chord !== null) {
          const velocity = this.getEmotionalVelocity(emotion, 'pad');
          this.instruments.pad.triggerAttackRelease(chord, "2n", time, velocity);
        }
      }, [...musicData.chords, null], "1n");
      
      // Create percussion patterns based on emotion
      const kickPattern = this.getEmotionalKickPattern(emotion);
      const snarePattern = this.getEmotionalSnarePattern(emotion);
      
      // Create kick sequence with beat triggers
      const kickSequence = new Tone.Sequence((time, note) => {
        if (note !== null) {
          const velocity = this.getEmotionalVelocity(emotion, 'kick');
          this.instruments.kick.triggerAttackRelease(note, "8n", time, velocity);
          
          // Trigger strong particle beat on kick
          Tone.Draw.schedule(() => {
            this.handleBeat('kick', velocity * 1.5);
          }, time);
        }
      }, kickPattern, "8n");
      
      // Create snare sequence with beat triggers
      const snareSequence = new Tone.Sequence((time, velocity) => {
        if (velocity > 0) {
          const adjustedVelocity = velocity * this.getEmotionalVelocity(emotion, 'snare');
          this.instruments.snare.triggerAttackRelease("16n", time, adjustedVelocity);
          
          // Trigger particle beat on snare
          Tone.Draw.schedule(() => {
            this.handleBeat('snare', adjustedVelocity);
          }, time);
        }
      }, snarePattern, "8n");
      
      // Add sequences to active list
      this.activeSequences = [leadSequence, bassSequence, padSequence, kickSequence, snareSequence];
      
      // Start all sequences
      this.activeSequences.forEach(seq => {
        seq.start(0);
      });
      
      // Play a chord to signal the change with emotional intensity
      const chordNotes = musicData.chords[0] || ['C4', 'E4', 'G4'];
      const chordVelocity = this.getEmotionalVelocity(emotion);
      this.instruments.lead.triggerAttackRelease(chordNotes, '4n', undefined, chordVelocity);
      
      // Update UI parameters through callback
      if (this.onAudioParamChange) {
        this.onAudioParamChange({
          tempo: musicData.tempo,
          scale: emotionScaleNames[emotion] || 'pentatonisch',
          reverb: musicData.effects ? musicData.effects.reverb : 0.5,
          instrument: 'synth'
        });
      }
      
    } catch (error) {
      console.error('Fout bij het starten van emotie muziek:', error);
    }
  }

  // Get emotional velocity for different instruments
  getEmotionalVelocity(emotion, instrument = 'lead') {
    const baseVelocities = {
      happy: { lead: 0.8, bass: 0.7, pad: 0.6, kick: 0.8, snare: 0.7 },
      sad: { lead: 0.4, bass: 0.5, pad: 0.8, kick: 0.4, snare: 0.3 },
      angry: { lead: 0.9, bass: 0.8, pad: 0.5, kick: 0.9, snare: 0.9 },
      fearful: { lead: 0.3, bass: 0.4, pad: 0.7, kick: 0.3, snare: 0.4 },
      disgusted: { lead: 0.6, bass: 0.6, pad: 0.4, kick: 0.5, snare: 0.6 },
      surprised: { lead: 0.7, bass: 0.6, pad: 0.5, kick: 0.7, snare: 0.8 },
      neutral: { lead: 0.6, bass: 0.6, pad: 0.6, kick: 0.6, snare: 0.6 }
    };
    
    return baseVelocities[emotion]?.[instrument] || 0.6;
  }

  // Get emotional kick patterns
  getEmotionalKickPattern(emotion) {
    const patterns = {
      angry: ['C2', null, 'C2', null, 'C2', null, 'C2', null],
      happy: ['C2', null, null, null, 'C2', null, null, null],
      sad: ['C2', null, null, null, null, null, 'C2', null],
      fearful: ['C2', null, null, null, null, null, null, null],
      surprised: ['C2', null, 'C2', null, null, 'C2', null, null],
      disgusted: ['C2', null, null, 'C2', null, null, null, null],
      neutral: ['C2', null, null, null, 'C2', null, null, null]
    };
    
    return patterns[emotion] || patterns.neutral;
  }

  // Get emotional snare patterns
  getEmotionalSnarePattern(emotion) {
    const patterns = {
      angry: [null, 0.7, null, 0.7, null, 0.7, null, 0.7],
      happy: [null, null, 0.7, null, null, null, 0.7, null],
      sad: [null, null, 0.4, null, null, null, null, null],
      fearful: [null, null, 0.3, null, null, null, 0.2, null],
      surprised: [null, 0.6, null, null, 0.6, null, null, 0.6],
      disgusted: [null, null, 0.5, null, null, 0.4, null, null],
      neutral: [null, null, 0.5, null, null, null, 0.5, null]
    };
    
    return patterns[emotion] || patterns.neutral;
  }

  // Change the current emotion
  changeEmotion(emotion) {
    // Skip if audio is not initialized
    if (!this.isInitialized) {
      return;
    }
    
    // Skip if it's the same emotion
    if (this.currentEmotion === emotion) {
      return;
    }
    
    try {
      // Stop current sequences and start new ones
      this.startEmotionMusic(emotion);
    } catch (error) {
      console.error('Fout bij het wijzigen van emotie:', error);
    }
  }

  // Handle beat events and trigger particle animations
  handleBeat(beatType = 'kick', intensity = 1) {
    this.beatCount++;
    if (this.onBeat) {
      this.onBeat({
        type: beatType,
        intensity: intensity,
        count: this.beatCount,
        emotion: this.currentEmotion
      });
    }
  }

  // Cleanup resources
  dispose() {
    // Stop all sequences
    this.stopAllSequences();
    
    // Dispose all instruments
    Object.values(this.instruments).forEach(instrument => {
      if (instrument && typeof instrument.dispose === 'function') {
        instrument.dispose();
      }
    });
    
    // Dispose all effects
    Object.values(this.effects).forEach(effect => {
      if (effect && typeof effect.dispose === 'function') {
        effect.dispose();
      }
    });
    
    if (this.masterVolume) {
      this.masterVolume.dispose();
    }
    
    if (this.musicVolume) {
      this.musicVolume.dispose();
    }
    
    // Stop transport
    Tone.Transport.stop();
    Tone.Transport.cancel();
    
    this.isInitialized = false;
  }
}