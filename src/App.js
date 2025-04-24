import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import * as Tone from 'tone';
import './App.css';

function App() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState('neutral');
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(-15); // Volume in decibels (dB)
  const [musicMode, setMusicMode] = useState('dynamic'); // 'dynamic' or 'manual'
  const [manualEmotion, setManualEmotion] = useState('neutral');
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [audioParams, setAudioParams] = useState({
    tempo: 100,
    scale: 'major',
    reverb: 0.5,
    instrument: 'synth'
  });
  
  // Audio elements
  const instrumentsRef = useRef({});
  const effectsRef = useRef({});
  const activeSequencesRef = useRef([]);
  const masterVolumeRef = useRef(null);
  const currentEmotionRef = useRef('neutral');
  const detectionIntervalRef = useRef(null);
  const audioInitializedRef = useRef(false);
  const musicModeRef = useRef('dynamic');
  
  // Update the musicModeRef whenever musicMode changes
  useEffect(() => {
    musicModeRef.current = musicMode;
  }, [musicMode]);
  
  // Load face detection models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // This path must match where you placed the models
        const MODEL_URL = process.env.PUBLIC_URL + '/models';
        
        // Load the required models
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Fout bij het laden van modellen:', error);
      }
    };
    
    loadModels();
    
    // Cleanup function
    return () => {
      // Stop all sequences
      stopAllSequences();
      
      // Dispose all instruments
      Object.values(instrumentsRef.current).forEach(instrument => {
        if (instrument && typeof instrument.dispose === 'function') {
          instrument.dispose();
        }
      });
      
      // Dispose all effects
      Object.values(effectsRef.current).forEach(effect => {
        if (effect && typeof effect.dispose === 'function') {
          effect.dispose();
        }
      });
      
      if (masterVolumeRef.current) {
        masterVolumeRef.current.dispose();
      }
      
      // Clear face detection interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      // Stop transport
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);
  
  // Stop all currently playing sequences
  const stopAllSequences = () => {
    try {
      // Stop all active sequences
      activeSequencesRef.current.forEach(seq => {
        if (seq && typeof seq.stop === 'function') {
          seq.stop();
        }
      });
      
      // Clear the active sequences array
      activeSequencesRef.current = [];
      
      // Cancel any scheduled events
      Tone.Transport.cancel();
    } catch (error) {
      console.error('Fout bij het stoppen van sequenties:', error);
    }
  };
  
  // Update volume when slider changes
  useEffect(() => {
    if (masterVolumeRef.current) {
      masterVolumeRef.current.volume.value = volume;
    }
  }, [volume]);
  
  // Create and start sequences for a given emotion
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startEmotionMusic = useCallback((emotion) => {
    try {
      currentEmotionRef.current = emotion;
      
      // Define unique musical parameters for each emotion
      const emotionMusicData = {
        happy: {
          scale: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], // Major scale
          chords: [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5']],
          bassNotes: ['C3', 'G3', 'F3', 'G3'],
          tempo: 120,
          effects: {
            filter: 2000,
            reverb: 0.3,
            chorus: 0.3,
            delay: 0.2
          },
          synth: {
            oscillator: "triangle"
          }
        },
        sad: {
          scale: ['A3', 'C4', 'D4', 'E4', 'G4', 'A4'], // Minor scale
          chords: [['A3', 'C4', 'E4'], ['G3', 'B3', 'D4'], ['E3', 'G3', 'B3']],
          bassNotes: ['A2', 'E3', 'G2', 'D3'],
          tempo: 75,
          effects: {
            filter: 800,
            reverb: 0.8,
            chorus: 0.4,
            delay: 0.5
          },
          synth: {
            oscillator: "sine"
          }
        },
        angry: {
          scale: ['E3', 'G3', 'A3', 'B3', 'D4', 'E4'], // Phrygian mode
          chords: [['E3', 'G3', 'B3', 'D4'], ['A3', 'C4', 'E4'], ['B3', 'D4', 'F4']],
          bassNotes: ['E2', 'F2', 'D2', 'E2'],
          tempo: 140,
          effects: {
            filter: 4000,
            reverb: 0.2,
            chorus: 0.1,
            delay: 0.1,
            distortion: 0.8
          },
          synth: {
            oscillator: "sawtooth"
          }
        },
        fearful: {
          scale: ['D3', 'F3', 'G3', 'A3', 'C4', 'D4'], // Dorian mode
          chords: [['D3', 'F3', 'A3'], ['C3', 'E3', 'G3'], ['A2', 'C3', 'E3']],
          bassNotes: ['D2', 'A2', 'C2', 'G2'],
          tempo: 95,
          effects: {
            filter: 600,
            reverb: 0.9,
            chorus: 0.6,
            delay: 0.7,
            phaser: 0.6
          },
          synth: {
            oscillator: "triangle"
          }
        },
        disgusted: {
          scale: ['D3', 'E3', 'F3', 'G3', 'A3', 'C4', 'D4'], // Altered scale
          chords: [['D3', 'F3', 'G3'], ['G3', 'C4', 'D4'], ['F3', 'A3', 'C4']],
          bassNotes: ['D2', 'G2', 'F2', 'A2'],
          tempo: 85,
          effects: {
            filter: 1200,
            reverb: 0.5,
            chorus: 0.3,
            delay: 0.3,
            distortion: 0.5
          },
          synth: {
            oscillator: "square"
          }
        },
        surprised: {
          scale: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'], // Pentatonic major
          chords: [['C4', 'E4', 'G4', 'B4'], ['G4', 'B4', 'D5'], ['A4', 'C5', 'E5']],
          bassNotes: ['C3', 'G3', 'A3', 'E3'],
          tempo: 110,
          effects: {
            filter: 3000,
            reverb: 0.4,
            chorus: 0.5,
            delay: 0.4,
            phaser: 0.4
          },
          synth: {
            oscillator: "triangle"
          }
        },
        neutral: {
          scale: ['C4', 'D4', 'E4', 'G4', 'A4'], // Pentatonic
          chords: [['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4']],
          bassNotes: ['C3', 'G2', 'A2', 'D3'],
          tempo: 95,
          effects: {
            filter: 1500,
            reverb: 0.5,
            chorus: 0.2,
            delay: 0.3
          },
          synth: {
            oscillator: "sine"
          }
        }
      };
      
      // Get the music data for this emotion
      const musicData = emotionMusicData[emotion] || emotionMusicData.neutral;
      
      // Set the tempo
      Tone.Transport.bpm.value = musicData.tempo;
      
      // Update effect settings
      if (musicData.effects) {
        const effects = musicData.effects;
        if (effectsRef.current.filter) {
          effectsRef.current.filter.frequency.rampTo(effects.filter || 1000, 0.5);
        }
        if (effectsRef.current.reverb) {
          effectsRef.current.reverb.decay = 1 + (effects.reverb || 0.5) * 5;
        }
        if (effectsRef.current.chorus) {
          effectsRef.current.chorus.depth = (effects.chorus || 0.3) * 0.8;
        }
        if (effectsRef.current.delay) {
          effectsRef.current.delay.feedback.value = effects.delay || 0.3;
        }
        if (effectsRef.current.distortion) {
          effectsRef.current.distortion.distortion = effects.distortion || 0.2;
        }
        if (effectsRef.current.phaser) {
          effectsRef.current.phaser.octaves = (effects.phaser || 0.3) * 5 + 1;
        }
      }
      
      // Update synth settings
      if (musicData.synth && instrumentsRef.current.lead) {
        instrumentsRef.current.lead.set({
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
      stopAllSequences();
      
      // Create lead melody sequence
      const leadSequence = new Tone.Sequence((time, idx) => {
        if (idx !== null) {
          const note = musicData.scale[idx % musicData.scale.length];
          instrumentsRef.current.lead.triggerAttackRelease(note, "8n", time);
        }
      }, melodyPattern, "8n");
      
      // Create bass sequence
      const bassSequence = new Tone.Sequence((time, note) => {
        if (note !== null) {
          instrumentsRef.current.bass.triggerAttackRelease(note, "4n", time);
        }
      }, musicData.bassNotes, "2n");
      
      // Create chord/pad sequence
      const padSequence = new Tone.Sequence((time, chord) => {
        if (chord !== null) {
          instrumentsRef.current.pad.triggerAttackRelease(chord, "2n", time);
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
          instrumentsRef.current.kick.triggerAttackRelease(note, "8n", time);
        }
      }, kickPattern, "8n");
      
      // Create snare sequence
      const snareSequence = new Tone.Sequence((time, velocity) => {
        if (velocity > 0) {
          instrumentsRef.current.snare.triggerAttackRelease("16n", time, velocity);
        }
      }, snarePattern, "8n");
      
      // Add sequences to active list
      activeSequencesRef.current = [leadSequence, bassSequence, padSequence, kickSequence, snareSequence];
      
      // Start all sequences
      activeSequencesRef.current.forEach(seq => {
        seq.start(0);
      });
      
      // Play a chord to signal the change
      const chordNotes = musicData.chords[0] || ['C4', 'E4', 'G4'];
      instrumentsRef.current.lead.triggerAttackRelease(chordNotes, '4n');
      
      // Update UI parameters
      setAudioParams({
        tempo: musicData.tempo,
        scale: emotion === 'happy' ? 'majeur' : 
               emotion === 'sad' ? 'mineur' : 
               emotion === 'angry' ? 'phrygisch' :
               emotion === 'fearful' ? 'dorisch' : 
               emotion === 'disgusted' ? 'alternatief' :
               emotion === 'surprised' ? 'pentatonisch majeur' : 'pentatonisch',
        reverb: musicData.effects ? musicData.effects.reverb : 0.5,
        instrument: 'synth'
      });
      
    } catch (error) {
      console.error('Fout bij het starten van emotie muziek:', error);
    }
  }, []);
  
  // Define changeEmotion with useCallback and eslint-disable to avoid circular dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const changeEmotion = useCallback((emotion) => {
    // Check if audio is initialized
    if (!audioInitializedRef.current) {
      return;
    }
    
    // Skip if it's the same emotion
    if (currentEmotionRef.current === emotion) {
      return;
    }
    
    try {
      // Stop current sequences and start new ones
      startEmotionMusic(emotion);
    } catch (error) {
      console.error('Fout bij het wijzigen van emotie:', error);
    }
  }, []);
  
  // Effect to monitor audio initialization state
  useEffect(() => {
    audioInitializedRef.current = isAudioInitialized;
    
    // If audio was just initialized and we're in dynamic mode, update to current emotion
    if (isAudioInitialized && musicMode === 'dynamic') {
      changeEmotion(detectedEmotion);
    }
  }, [isAudioInitialized, musicMode, detectedEmotion, changeEmotion]);
  
  // Setup audio system
  const initializeAudio = async () => {
    try {
      // Start the audio context
      await Tone.start();
      
      // Create master volume
      masterVolumeRef.current = new Tone.Volume(volume).toDestination();
      
      // Create effects
      effectsRef.current = {
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
      await effectsRef.current.reverb.generate();
      
      // Create instruments
      instrumentsRef.current = {
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
      instrumentsRef.current.lead.chain(
        effectsRef.current.filter,
        effectsRef.current.chorus,
        effectsRef.current.delay,
        effectsRef.current.reverb,
        masterVolumeRef.current
      );
      
      // Bass gets less effects for clarity
      instrumentsRef.current.bass.chain(
        effectsRef.current.filter,
        effectsRef.current.reverb,
        masterVolumeRef.current
      );
      
      // Pad gets lots of atmosphere
      instrumentsRef.current.pad.chain(
        effectsRef.current.phaser,
        effectsRef.current.chorus,
        effectsRef.current.reverb,
        masterVolumeRef.current
      );
      
      // Kick gets minimal processing
      instrumentsRef.current.kick.chain(
        new Tone.Filter(800, "lowpass"),
        masterVolumeRef.current
      );
      
      // Snare gets some character
      instrumentsRef.current.snare.chain(
        new Tone.Filter(2000, "highpass"),
        new Tone.Filter(6000, "lowpass"),
        effectsRef.current.distortion,
        masterVolumeRef.current
      );
      
      // Set initial tempo
      Tone.Transport.bpm.value = 100;
      
      // Start transport
      Tone.Transport.start();
      
      // Update the state AND the ref
      setIsAudioInitialized(true);
      audioInitializedRef.current = true;
      
      // Start with the neutral emotion
      await startEmotionMusic('neutral');
      
      return true;
    } catch (error) {
      console.error('Fout bij het initialiseren van audio:', error);
      return false;
    }
  };
  
  // Start video when models are loaded
  useEffect(() => {
    if (isModelLoaded) {
      startVideo();
    }
  }, [isModelLoaded]);
  
  // Start webcam video feed
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Fout bij toegang tot webcam:', error);
    }
  };
  
  // Process video frames for face detection
  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const displaySize = {
      width: videoRef.current.videoWidth,
      height: videoRef.current.videoHeight
    };
    
    // Match canvas size to video
    faceapi.matchDimensions(canvasRef.current, displaySize);
    
    // Clear any existing interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    // Run face detection every 300ms to avoid too many updates
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      
      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();
        
        if (detections && detections.length > 0) {
          // Get strongest emotion
          const expressions = detections[0].expressions;
          const emotion = Object.keys(expressions).reduce((a, b) => 
            expressions[a] > expressions[b] ? a : b
          );
          
          const confidence = expressions[emotion];
          
          // Update detected emotion in UI
          setDetectedEmotion(emotion);
          
          // Change music ONLY if in dynamic mode and confidence is good
          if (audioInitializedRef.current && 
              musicModeRef.current === 'dynamic' && 
              confidence > 0.5) {
            changeEmotion(emotion);
          }
          
          // Draw results on canvas
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
        }
      } catch (error) {
        console.error('Fout tijdens gezichtsdetectie:', error);
      }
    }, 300);
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  };
  
  // Initialize audio
  const handleStartButton = async () => {
    if (!isAudioInitialized) {
      try {
        const success = await initializeAudio();
        
        // If initialization was successful, immediately change to detected emotion
        if (success && musicMode === 'dynamic') {
          changeEmotion(detectedEmotion);
        }
      } catch (error) {
        console.error('Fout in start knop handler:', error);
      }
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e) => {
    setVolume(Number(e.target.value));
  };
  
  // Handle music mode change
  const handleModeChange = (mode) => {
    setMusicMode(mode);
    
    // If switching to manual mode, use the manually selected emotion
    if (mode === 'manual') {
      changeEmotion(manualEmotion);
    } else {
      // If switching to dynamic mode, use the currently detected emotion
      changeEmotion(detectedEmotion);
    }
  };
  
  // Handle manual emotion selection
  const handleManualEmotionChange = (emotion) => {
    setManualEmotion(emotion);
    
    // Only change the music if in manual mode
    if (musicMode === 'manual') {
      changeEmotion(emotion);
    }
  };
  
  // Toggle debug menu
  const toggleDebugMenu = () => {
    setShowDebugMenu(!showDebugMenu);
  };
  
  // Emotion colors for UI
  const emotionColors = {
    happy: '#FFD700',     // Gold
    sad: '#4682B4',       // Steel Blue
    angry: '#FF4500',     // Orange Red
    fearful: '#800080',   // Purple
    disgusted: '#006400', // Dark Green
    surprised: '#FF69B4', // Hot Pink
    neutral: '#A9A9A9'    // Dark Gray
  };
  
  // Translate emotion names to Dutch
  const emotionNamesDutch = {
    happy: 'BLIJ',
    sad: 'VERDRIETIG',
    angry: 'BOOS',
    fearful: 'ANGSTIG',
    disgusted: 'WALGEND',
    surprised: 'VERRAST',
    neutral: 'NEUTRAAL'
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>De Muzikale Spiegel</h1>
        
        {!isModelLoaded ? (
          <div className="loading">Gezichtsdetectiemodellen laden...</div>
        ) : (
          <>
            <div className="video-container">
              <video 
                ref={videoRef}
                width="640"
                height="480"
                autoPlay
                muted
                onPlay={handleVideoPlay}
              />
              <canvas ref={canvasRef} className="face-canvas" />
            </div>
            
            <div className="controls">
              {!isAudioInitialized ? (
                <button 
                  onClick={handleStartButton}
                  className="start-button"
                >
                  Start Muziekervaring
                </button>
              ) : (
                <>
                  <div className="control-panel">
                    <div className="volume-control">
                      <label htmlFor="volume">Volume:</label>
                      <input
                        id="volume"
                        type="range"
                        min="-60"
                        max="0"
                        step="1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="volume-slider"
                      />
                      <span className="volume-label">{Math.round((60 + Number(volume)) / 0.6)}%</span>
                    </div>
                    
                    <div className="music-info">
                      <div className="music-param">
                        <span className="param-label">Tempo:</span>
                        <span className="param-value">{audioParams.tempo} BPM</span>
                      </div>
                      <div className="music-param">
                        <span className="param-label">Toonladder:</span>
                        <span className="param-value">{audioParams.scale}</span>
                      </div>
                      <div className="music-param">
                        <span className="param-label">Galm:</span>
                        <span className="param-value">{Math.round(audioParams.reverb * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div 
                className="emotion-display"
                style={{
                  backgroundColor: emotionColors[detectedEmotion] || emotionColors.neutral
                }}
              >
                {emotionNamesDutch[detectedEmotion]}
              </div>
              
              <div className="instructions">
                <p>Je gezichtsuitdrukking bepaalt de muziek!</p>
                <p>Maak duidelijke expressies voor de beste detectie.</p>
              </div>
            </div>
          </>
        )}
        
        <div className="footer">
          Opmerking: Deze demo vereist toegang tot je camera om gezichtsuitdrukkingen te detecteren.
          <br />Er worden geen videogegevens opgeslagen of verzonden.
        </div>
        
        {/* Debug button in bottom right */}
        <button 
          className="debug-toggle-button"
          onClick={toggleDebugMenu}
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            padding: '5px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            opacity: '0.7'
          }}
        >
          Debug
        </button>
        
        {/* Debug menu */}
        {showDebugMenu && (
          <div 
            className="debug-menu"
            style={{
              position: 'fixed',
              bottom: '50px',
              right: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: '15px',
              borderRadius: '5px',
              zIndex: 1000,
              width: '250px',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ marginBottom: '15px', borderBottom: '1px solid #555', paddingBottom: '10px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#fff' }}>Ontwikkelaarsmenu</h3>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '12px', marginBottom: '5px', color: '#ddd' }}>Besturingsmodus:</div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  style={{
                    flex: 1, 
                    padding: '5px',
                    backgroundColor: musicMode === 'dynamic' ? '#4CAF50' : '#555',
                    border: 'none',
                    borderRadius: '3px',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleModeChange('dynamic')}
                >
                  Gezichtsdetectie
                </button>
                <button 
                  style={{
                    flex: 1, 
                    padding: '5px',
                    backgroundColor: musicMode === 'manual' ? '#4CAF50' : '#555',
                    border: 'none',
                    borderRadius: '3px',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleModeChange('manual')}
                >
                  Handmatig
                </button>
              </div>
            </div>

            {musicMode === 'manual' && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', marginBottom: '5px', color: '#ddd' }}>Selecteer Emotie:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'].map(emotion => (
                    <button
                      key={emotion}
                      style={{
                        flex: '0 0 calc(33% - 5px)',
                        padding: '5px 0',
                        backgroundColor: manualEmotion === emotion ? emotionColors[emotion] : '#555',
                        border: 'none',
                        borderRadius: '3px',
                        color: ['happy', 'surprised'].includes(emotion) && manualEmotion === emotion ? '#000' : '#fff',
                        fontSize: '10px',
                        cursor: 'pointer',
                        marginBottom: '5px'
                      }}
                      onClick={() => handleManualEmotionChange(emotion)}
                    >
                      {emotionNamesDutch[emotion]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '11px', color: '#999', marginTop: '10px', textAlign: 'center' }}>
              Alleen voor ontwikkelaars
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;