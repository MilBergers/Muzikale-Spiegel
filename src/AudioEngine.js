import * as Tone from 'tone';
import { emotionMusicData, emotionScaleNames } from './constants';

export default class AudioEngine {
  constructor(onAudioParamChange) {
    this.instruments = {};
    this.effects = {};
    this.activeSequences = [];
    this.masterVolume = null;
    this.currentEmotion = 'neutral';
    this.isInitialized = false;
    this.onAudioParamChange = onAudioParamChange;
    
    // Bind methods to ensure 'this' context is preserved
    this.initialize = this.initialize.bind(this);
    this.setVolume = this.setVolume.bind(this);
    this.stopAllSequences = this.stopAllSequences.bind(this);
    this.startEmotionMusic = this.startEmotionMusic.bind(this);
    this.changeEmotion = this.changeEmotion.bind(this);
    this.dispose = this.dispose.bind(this);
  }

  // Initialize audio system
  async initialize(volume) {
    try {
      // Start the audio context
      await Tone.start();
      
      // Create master volume
      this.masterVolume = new Tone.Volume(volume).toDestination();
      
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

  // Set volume
  setVolume(value) {
    if (this.masterVolume) {
      this.masterVolume.volume.value = value;
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
      
      // Set the tempo
      Tone.Transport.bpm.value = musicData.tempo;
      
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
      
      // Create lead melody sequence
      const leadSequence = new Tone.Sequence((time, idx) => {
        if (idx !== null) {
          const note = musicData.scale[idx % musicData.scale.length];
          this.instruments.lead.triggerAttackRelease(note, "8n", time);
        }
      }, melodyPattern, "8n");
      
      // Create bass sequence
      const bassSequence = new Tone.Sequence((time, note) => {
        if (note !== null) {
          this.instruments.bass.triggerAttackRelease(note, "4n", time);
        }
      }, musicData.bassNotes, "2n");
      
      // Create chord/pad sequence
      const padSequence = new Tone.Sequence((time, chord) => {
        if (chord !== null) {
          this.instruments.pad.triggerAttackRelease(chord, "2n", time);
        }
      }, [...musicData.chords, null], "1n");
      
      // Create percussion patterns based on emotion
      const kickPattern = emotion === 'angry' ? 
        ['C2', null, 'C2', null, 'C2', null, 'C2', null] : 
        emotion === 'happy' ? 
        ['C2', null, null, null, 'C2', null, null, null] :
        ['C2', null, null, null, 'C2', null, null, null];
          
      const snarePattern = emotion === 'angry' ? 
        [null, 0.7, null, 0.7, null, 0.7, null, 0.7] : 
        emotion === 'happy' ? 
        [null, null, 0.7, null, null, null, 0.7, null] :
        [null, null, 0.7, null, null, null, 0.5, null];
      
      // Create kick sequence
      const kickSequence = new Tone.Sequence((time, note) => {
        if (note !== null) {
          this.instruments.kick.triggerAttackRelease(note, "8n", time);
        }
      }, kickPattern, "8n");
      
      // Create snare sequence
      const snareSequence = new Tone.Sequence((time, velocity) => {
        if (velocity > 0) {
          this.instruments.snare.triggerAttackRelease("16n", time, velocity);
        }
      }, snarePattern, "8n");
      
      // Add sequences to active list
      this.activeSequences = [leadSequence, bassSequence, padSequence, kickSequence, snareSequence];
      
      // Start all sequences
      this.activeSequences.forEach(seq => {
        seq.start(0);
      });
      
      // Play a chord to signal the change
      const chordNotes = musicData.chords[0] || ['C4', 'E4', 'G4'];
      this.instruments.lead.triggerAttackRelease(chordNotes, '4n');
      
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
    
    // Stop transport
    Tone.Transport.stop();
    Tone.Transport.cancel();
    
    this.isInitialized = false;
  }
}