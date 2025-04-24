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
  const [stableEmotion, setStableEmotion] = useState('neutral'); // New: emotion that's been stable for threshold time
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(-15); // Volume in decibels (dB)
  const [musicMode, setMusicMode] = useState('dynamic'); // 'dynamic' or 'manual'
  const [manualEmotion, setManualEmotion] = useState('neutral');
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [moodStabilityThreshold, setMoodStabilityThreshold] = useState(1); // Changed: Default is now 1 second
  const [audioParams, setAudioParams] = useState({
    tempo: 100,
    scale: 'major',
    reverb: 0.5,
    instrument: 'synth'
  });
  
  // Module refs
  const audioEngineRef = useRef(null);
  const faceDetectionRef = useRef(null);
  
  // Refs for state values to avoid stale closures
  const isAudioInitializedRef = useRef(false);
  const musicModeRef = useRef('dynamic');
  const detectedEmotionRef = useRef('neutral');
  const lastEmotionChangeTimeRef = useRef(Date.now()); // New: track when emotion changed
  const moodStabilityThresholdRef = useRef(1); // Track stability threshold in a ref
  
  // Initialize modules on component mount
  useEffect(() => {
    // Create audio engine with param change callback
    audioEngineRef.current = new AudioEngine(setAudioParams);
    
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
  
  // Update moodStabilityThresholdRef when the state changes
  useEffect(() => {
    moodStabilityThresholdRef.current = moodStabilityThreshold;
  }, [moodStabilityThreshold]);
  
  // Handle emotion detection with stability threshold
  const handleEmotionDetected = useCallback((emotion, confidence) => {
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
    // Use the ref value to always have the latest threshold
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
  }, []); // No dependencies needed as we're using refs
  
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
    // If audio was just initialized and we're in dynamic mode, update to current stable emotion
    if (isAudioInitialized && musicMode === 'dynamic' && audioEngineRef.current) {
      audioEngineRef.current.changeEmotion(stableEmotion);
    } else if (isAudioInitialized && musicMode === 'manual' && audioEngineRef.current) {
      audioEngineRef.current.changeEmotion(manualEmotion);
    }
  }, [isAudioInitialized, musicMode, stableEmotion, manualEmotion]);
  
  // Initialize audio
  const handleStartButton = async () => {
    if (!isAudioInitialized && audioEngineRef.current) {
      try {
        const success = await audioEngineRef.current.initialize(volume);
        
        // If initialization was successful
        if (success) {
          setIsAudioInitialized(true);
          
          // Immediately change to the current emotion if in dynamic mode
          if (musicMode === 'dynamic') {
            audioEngineRef.current.changeEmotion(stableEmotion);
          } else if (musicMode === 'manual') {
            audioEngineRef.current.changeEmotion(manualEmotion);
          }
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
  
  // Handle mood stability threshold change
  const handleMoodStabilityChange = (e) => {
    setMoodStabilityThreshold(Number(e.target.value));
  };
  
  // Handle music mode change
  const handleModeChange = (mode) => {
    setMusicMode(mode);
    
    // Only change if audio is initialized
    if (isAudioInitialized && audioEngineRef.current) {
      // If switching to manual mode, use the manually selected emotion
      if (mode === 'manual') {
        audioEngineRef.current.changeEmotion(manualEmotion);
      } else {
        // If switching to dynamic mode, use the currently stable emotion
        audioEngineRef.current.changeEmotion(stableEmotion);
      }
    }
  };
  
  // Handle manual emotion selection
  const handleManualEmotionChange = (emotion) => {
    setManualEmotion(emotion);
    
    // Only change the music if in manual mode and audio is initialized
    if (musicMode === 'manual' && isAudioInitialized && audioEngineRef.current) {
      audioEngineRef.current.changeEmotion(emotion);
    }
  };
  
  // Toggle debug menu
  const toggleDebugMenu = () => {
    setShowDebugMenu(!showDebugMenu);
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
                {musicMode === 'dynamic' && stableEmotion !== detectedEmotion && (
                  <div style={{ fontSize: '10px', marginTop: '4px' }}>
                    Stabiliseren...
                  </div>
                )}
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

            {/* New: Mood stability threshold slider */}
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
              Alleen voor ontwikkelaars
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;