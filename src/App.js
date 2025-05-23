import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import AudioEngine from './AudioEngine';
import FaceDetection from './FaceDetection';
import { emotionColors, emotionNamesDutch } from './constants';

function App() {
  // DOM refs
  const videoRef = useRef();
  const canvasRef = useRef();
  
  // State hooks
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState('neutral');
  const [stableEmotion, setStableEmotion] = useState('neutral');
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(-15);
  const [musicMode, setMusicMode] = useState('dynamic');
  const [manualEmotion, setManualEmotion] = useState('neutral');
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [moodStabilityThreshold, setMoodStabilityThreshold] = useState(1);
  const [audioParams, setAudioParams] = useState({
    tempo: 100,
    scale: 'major',
    reverb: 0.5,
    instrument: 'synth'
  });
  
  // New states for enhanced features
  const [faceDetected, setFaceDetected] = useState(false);
  const [showClickToStart, setShowClickToStart] = useState(true);
  const [musicVolume, setMusicVolume] = useState(1); // For fade in/out
  const [particleTriggers, setParticleTriggers] = useState([]); // For beat-triggered animations
  const [stabilizationProgress, setStabilizationProgress] = useState(0); // Track stabilization progress
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false); // Track multiple faces
  
  // Module refs
  const audioEngineRef = useRef(null);
  const faceDetectionRef = useRef(null);
  
  // Refs for state values to avoid stale closures
  const isAudioInitializedRef = useRef(false);
  const musicModeRef = useRef('dynamic');
  const detectedEmotionRef = useRef('neutral');
  const lastEmotionChangeTimeRef = useRef(Date.now());
  const moodStabilityThresholdRef = useRef(1);
  const faceDetectedRef = useRef(false);
  const lastFaceDetectionTimeRef = useRef(Date.now());
  const fadeTimeoutRef = useRef(null);
  
  // Handle beat events from audio engine
  const handleBeat = useCallback((beatData) => {
    const { type, intensity, count, emotion } = beatData;
    
    // Add a new trigger that will affect specific particles
    const newTrigger = {
      id: Date.now() + Math.random(),
      type,
      intensity,
      timestamp: Date.now(),
      emotion,
      particleIndex: count % 12 // Rotate through particles
    };
    
    setParticleTriggers(prev => {
      // Keep only recent triggers (last 2 seconds)
      const recent = prev.filter(trigger => Date.now() - trigger.timestamp < 2000);
      return [...recent, newTrigger];
    });
  }, []);

  // Initialize modules on component mount
  useEffect(() => {
    // Create audio engine with param change callback and beat callback
    audioEngineRef.current = new AudioEngine(setAudioParams, handleBeat);
    
    // Create face detection module with emotion callback
    faceDetectionRef.current = new FaceDetection(handleEmotionDetected);
    faceDetectionRef.current.setRefs(videoRef, canvasRef);
    
    // Load face detection models
    const loadModels = async () => {
      const success = await faceDetectionRef.current.loadModels();
      if (success) {
        setIsModelLoaded(true);
      }
    };
    
    loadModels();
    
    // Cleanup on unmount
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
      if (faceDetectionRef.current) {
        faceDetectionRef.current.stopDetection();
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);
  
  // Keep refs in sync with state
  useEffect(() => {
    isAudioInitializedRef.current = isAudioInitialized;
  }, [isAudioInitialized]);
  
  useEffect(() => {
    musicModeRef.current = musicMode;
  }, [musicMode]);
  
  useEffect(() => {
    detectedEmotionRef.current = detectedEmotion;
  }, [detectedEmotion]);
  
  useEffect(() => {
    moodStabilityThresholdRef.current = moodStabilityThreshold;
  }, [moodStabilityThreshold]);
  
  useEffect(() => {
    faceDetectedRef.current = faceDetected;
  }, [faceDetected]);
  
  // Handle music fade in/out based on face detection
  useEffect(() => {
    if (!isAudioInitialized || !audioEngineRef.current) return;
    
    if (faceDetected) {
      // Face detected - fade in music immediately
      audioEngineRef.current.setMusicVolume(1);
      setMusicVolume(1);
      
      // Clear any pending fade out
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    } else {
      // No face detected - start slow fade out immediately
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      
      // Start fading immediately (no delay)
      if (audioEngineRef.current) {
        audioEngineRef.current.setMusicVolume(0.02);
        setMusicVolume(0.02);
      }
    }
  }, [faceDetected, isAudioInitialized]);
  
  // Handle emotion detection with stability threshold and face detection tracking
  const handleEmotionDetected = useCallback((emotion, confidence, hasDetection = true) => {
    // Update face detection status
    setFaceDetected(hasDetection);
    lastFaceDetectionTimeRef.current = Date.now();
    
    if (!hasDetection) {
      return; // Don't process emotion if no face detected
    }
    
    // Update detected emotion immediately (for UI display)
    setDetectedEmotion(emotion);
    
    // If emotion has changed, reset the timer
    if (emotion !== detectedEmotionRef.current) {
      lastEmotionChangeTimeRef.current = Date.now();
      return;
    }
    
    // Calculate how long this emotion has been stable
    const now = Date.now();
    const elapsedTimeSeconds = (now - lastEmotionChangeTimeRef.current) / 1000;
    
    // Only change music if emotion has been stable for the threshold time
    if (elapsedTimeSeconds >= moodStabilityThresholdRef.current) {
      // Update stable emotion
      setStableEmotion(emotion);
      
      // Change music ONLY if in dynamic mode and audio is initialized
      if (isAudioInitializedRef.current && 
          musicModeRef.current === 'dynamic' && 
          audioEngineRef.current) {
        audioEngineRef.current.changeEmotion(emotion);
      }
    }
  }, []);
  
  // Monitor face detection timeout and multiple faces
  useEffect(() => {
    const checkFaceStatus = setInterval(() => {
      const now = Date.now();
      const timeSinceLastDetection = (now - lastFaceDetectionTimeRef.current) / 1000;
      
      // If no face detected for more than 1 second, update state
      if (timeSinceLastDetection > 1 && faceDetectedRef.current) {
        setFaceDetected(false);
      }
      
      // Check for multiple faces if face detection is active
      if (faceDetectionRef.current) {
        const hasMultiple = faceDetectionRef.current.hasMultipleFaces();
        setMultipleFacesDetected(hasMultiple);
      }
    }, 500);
    
    return () => clearInterval(checkFaceStatus);
  }, []);
  
  // Start video when models are loaded
  useEffect(() => {
    if (isModelLoaded && faceDetectionRef.current) {
      faceDetectionRef.current.startVideo();
    }
  }, [isModelLoaded]);
  
  // Handle video start playing
  const handleVideoPlay = () => {
    if (faceDetectionRef.current) {
      faceDetectionRef.current.startDetection();
    }
  };
  
  // Update volume when slider changes
  useEffect(() => {
    if (audioEngineRef.current && isAudioInitialized) {
      audioEngineRef.current.setVolume(volume);
    }
  }, [volume, isAudioInitialized]);
  
  // Effect to handle audio initialization and emotion changes
  useEffect(() => {
    if (isAudioInitialized && musicMode === 'dynamic' && audioEngineRef.current) {
      audioEngineRef.current.changeEmotion(stableEmotion);
    } else if (isAudioInitialized && musicMode === 'manual' && audioEngineRef.current) {
      audioEngineRef.current.changeEmotion(manualEmotion);
    }
  }, [isAudioInitialized, musicMode, stableEmotion, manualEmotion]);
  
  // Auto-initialize audio when user clicks anywhere (improved flow)
  const handleAnyClick = async () => {
    if (!isAudioInitialized && audioEngineRef.current && showClickToStart) {
      try {
        const success = await audioEngineRef.current.initialize(volume);
        
        if (success) {
          setIsAudioInitialized(true);
          setShowClickToStart(false);
          
          // Immediately change to the current emotion if in dynamic mode
          if (musicMode === 'dynamic') {
            audioEngineRef.current.changeEmotion(stableEmotion);
          } else if (musicMode === 'manual') {
            audioEngineRef.current.changeEmotion(manualEmotion);
          }
        }
      } catch (error) {
        console.error('Fout bij audio initialisatie:', error);
      }
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e) => {
    setVolume(Number(e.target.value));
  };
  
  // Handle mood stability threshold change
  const handleMoodStabilityChange = (e) => {
    setMoodStabilityThreshold(Number(e.target.value));
  };
  
  // Handle music mode change
  const handleModeChange = (mode) => {
    setMusicMode(mode);
    
    if (isAudioInitialized && audioEngineRef.current) {
      if (mode === 'manual') {
        audioEngineRef.current.changeEmotion(manualEmotion);
      } else {
        audioEngineRef.current.changeEmotion(stableEmotion);
      }
    }
  };
  
  // Handle manual emotion selection
  const handleManualEmotionChange = (emotion) => {
    setManualEmotion(emotion);
    
    if (musicMode === 'manual' && isAudioInitialized && audioEngineRef.current) {
      audioEngineRef.current.changeEmotion(emotion);
    }
  };
  
  // Toggle debug menu
  const toggleDebugMenu = () => {
    setShowDebugMenu(!showDebugMenu);
  };

  // Compute which emotion to display based on mode
  const displayEmotion = musicMode === 'manual' ? manualEmotion : stableEmotion;
  
  return (
    <div className="App" onClick={handleAnyClick}>
      {/* Animated background */}
      <div 
        className="animated-background"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${emotionColors[displayEmotion]}33 0%, transparent 70%)`,
          opacity: musicVolume * 0.8
        }}
      />
      
      {/* Floating particles */}
      <div className="particles-container">
        {[...Array(12)].map((_, i) => {
          // Create unique properties for each particle
          const baseDelay = (i * 0.347) % 2.5;
          let baseOpacity = faceDetected || musicMode === 'manual' ? 
            0.6 + ((i * 0.173) % 0.4) : 0.3;
          
          // Dim particles when emotion is stabilizing (not yet stable)
          const isStabilizing = musicMode === 'dynamic' && stableEmotion !== detectedEmotion && faceDetected;
          if (isStabilizing) {
            baseOpacity *= 0.6; // Reduce opacity during stabilization
          }
          
          // Check if this particle should be triggered by recent beats
          const recentTrigger = particleTriggers.find(trigger => 
            trigger.particleIndex === i && Date.now() - trigger.timestamp < 500
          );
          
          // Calculate unique movement parameters for each particle
          const speedMultiplier = 0.7 + (i * 0.234) % 0.6; // 0.7-1.3x speed
          const directionOffset = i * 30; // 0-330 degrees
          const sizeVariation = 0.8 + (i * 0.156) % 0.4; // 0.8-1.2x size
          
          let particleStyle = {
            animationDelay: `${baseDelay}s`,
            opacity: baseOpacity,
            animationDuration: `${4 * speedMultiplier}s`,
            transform: `rotate(${directionOffset}deg) scale(${sizeVariation})`,
            '--beat-intensity': recentTrigger ? recentTrigger.intensity : 0,
            '--particle-index': i
          };
          
          // Add stabilization visual effect
          if (isStabilizing) {
            particleStyle.filter = 'blur(1px) brightness(0.8)';
            particleStyle.animationDuration = `${6 * speedMultiplier}s`; // Slower during stabilization
          }
          
          // Add beat-triggered effects
          if (recentTrigger) {
            const beatMultiplier = recentTrigger.intensity * 2;
            particleStyle.animationDuration = `${2 / beatMultiplier}s`;
            particleStyle.opacity = Math.min(1, baseOpacity * (1 + beatMultiplier));
            
            if (recentTrigger.type === 'kick') {
              particleStyle.filter = `brightness(${1 + beatMultiplier}) saturate(${1 + beatMultiplier * 0.5})`;
            } else if (recentTrigger.type === 'snare') {
              particleStyle.transform += ` scale(${1 + beatMultiplier * 0.5})`;
            } else if (recentTrigger.type === 'melody') {
              particleStyle.boxShadow = `0 0 ${20 + beatMultiplier * 20}px currentColor`;
            }
          }
          
          return (
            <div
              key={i}
              className={`particle emotion-${displayEmotion} particle-${i}`}
              style={particleStyle}
            />
          );
        })}
      </div>
      
      <header className="App-header">
        <h1 style={{ 
          textShadow: `0 0 20px ${emotionColors[displayEmotion]}66`,
          transition: 'text-shadow 0.5s ease'
        }}>
          De Muzikale Spiegel
        </h1>
        
        {/* Click to start overlay */}
        {showClickToStart && (
          <div className="click-to-start-overlay">
            <div className="click-prompt">
              <h2>🎵 Klik om te beginnen 🎵</h2>
              <p>Je gezichtsuitdrukking bepaalt de muziek!</p>
            </div>
          </div>
        )}
        
        <div className="instructions">
          <p>Je gezichtsuitdrukking bepaalt de muziek!</p>
          <p>Houd een uitdrukking vast - muziek en visuals veranderen na {moodStabilityThreshold}s</p>
          {!faceDetected && isAudioInitialized && musicMode === 'dynamic' && (
            <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
              📷 Geen gezicht gedetecteerd - muziek vervaagt...
            </p>
          )}
          {multipleFacesDetected && faceDetected && (
            <p style={{ color: '#ffa500', fontWeight: 'bold' }}>
              ⚠️ Meerdere gezichten gedetecteerd - alleen het grootste wordt gebruikt
            </p>
          )}
          {musicMode === 'manual' && (
            <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>
              🎛️ Handmatige bediening actief - gebruik het debug menu
            </p>
          )}
        </div>
        
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
                style={{
                  filter: `hue-rotate(${displayEmotion === 'angry' ? '320deg' : 
                                      displayEmotion === 'sad' ? '220deg' :
                                      displayEmotion === 'happy' ? '80deg' : 
                                      displayEmotion === 'fearful' ? '280deg' :
                                      displayEmotion === 'disgusted' ? '120deg' :
                                      displayEmotion === 'surprised' ? '300deg' : '0deg'}) saturate(${displayEmotion !== 'neutral' ? '1.5' : '1'}) brightness(${displayEmotion === 'happy' ? '1.2' : displayEmotion === 'sad' ? '0.8' : '1'})`,
                  transition: 'filter 0.5s ease'
                }}
              />
              <canvas ref={canvasRef} className="face-canvas" />
              
              {/* Face detection indicator */}
              <div className={`face-indicator ${faceDetected ? 'detected' : 'not-detected'}`} style={{
                opacity: musicMode === 'manual' ? 0.5 : 1,
                color: multipleFacesDetected ? '#ffa500' : 'inherit'
              }}>
                {faceDetected ? (multipleFacesDetected ? '👥' : '😊') : '👤'}
              </div>
            </div>
            
            <div className="controls">
              {isAudioInitialized && (
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
                    <div className="music-param">
                      <span className="param-label">Muziek:</span>
                      <span className="param-value" style={{
                        color: musicVolume > 0.1 ? '#4CAF50' : '#ff6b6b'
                      }}>
                        {musicVolume > 0.1 ? 'Actief' : 'Vervaagd'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div 
                className="emotion-display pulsing"
                style={{
                  backgroundColor: emotionColors[displayEmotion] || emotionColors.neutral,
                  transform: `scale(${faceDetected || musicMode === 'manual' ? 1 + (musicVolume * 0.1) : 0.9})`,
                  boxShadow: `0 0 ${faceDetected || musicMode === 'manual' ? 30 : 10}px ${emotionColors[displayEmotion]}66`
                }}
              >
                {emotionNamesDutch[displayEmotion]}
                
                {musicMode === 'manual' && (
                  <div style={{ fontSize: '10px', marginTop: '4px' }}>
                    Handmatig
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        <div className="footer">
          Deze demo vereist toegang tot je camera om gezichtsuitdrukkingen te detecteren.
          <br />Er worden geen videogegevens opgeslagen of verzonden.
        </div>
        
        {/* Debug button */}
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
            onClick={(e) => e.stopPropagation()}
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

            {musicMode === 'dynamic' && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', marginBottom: '5px', color: '#ddd' }}>
                  Stabiliteitsdrempel:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={moodStabilityThreshold}
                    onChange={handleMoodStabilityChange}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: '#ddd', minWidth: '40px', textAlign: 'right' }}>
                    {moodStabilityThreshold}s
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#999', marginTop: '3px', textAlign: 'center' }}>
                  Tijd nodig voor stemmingswisseling
                </div>
              </div>
            )}

            <div style={{ fontSize: '11px', color: '#999', marginTop: '10px', textAlign: 'center' }}>
              Face: {faceDetected ? '✅' : '❌'} | Volume: {Math.round(musicVolume * 100)}%
              {multipleFacesDetected && ' | ⚠️ Multiple'}
              <br />
              Live: {emotionNamesDutch[detectedEmotion]} | Stable: {emotionNamesDutch[stableEmotion]} | Active: {emotionNamesDutch[displayEmotion]}
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;