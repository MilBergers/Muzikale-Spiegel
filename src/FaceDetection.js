import * as faceapi from 'face-api.js';

export default class FaceDetection {
  constructor(onEmotionDetected) {
    this.videoRef = null;
    this.canvasRef = null;
    this.detectionInterval = null;
    this.isModelLoaded = false;
    this.onEmotionDetected = onEmotionDetected;
    this.lastDetectionTime = Date.now();
    this.consecutiveNoDetections = 0;
    this.lastEmotion = 'neutral';
    this.emotionConfidenceThreshold = 0.3; // Lower threshold for better sensitivity
    this.multipleFacesDetected = false;
  }

  // Set references to DOM elements
  setRefs(videoRef, canvasRef) {
    this.videoRef = videoRef;
    this.canvasRef = canvasRef;
  }

  // Load face detection models
  async loadModels() {
    try {
      // This path must match where you placed the models
      const MODEL_URL = process.env.PUBLIC_URL + '/models';
      
      // Load the required models
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      
      this.isModelLoaded = true;
      return true;
    } catch (error) {
      console.error('Fout bij het laden van modellen:', error);
      return false;
    }
  }

  // Start video feed
  async startVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      if (this.videoRef && this.videoRef.current) {
        this.videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Fout bij toegang tot webcam:', error);
    }
  }

  // Start face detection
  startDetection() {
    if (!this.videoRef || !this.videoRef.current || !this.canvasRef || !this.canvasRef.current) return;
    
    const displaySize = {
      width: this.videoRef.current.videoWidth,
      height: this.videoRef.current.videoHeight
    };
    
    // Match canvas size to video
    faceapi.matchDimensions(this.canvasRef.current, displaySize);
    
    // Clear any existing interval
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
    
    // Run face detection every 200ms for more responsive detection
    this.detectionInterval = setInterval(async () => {
      if (!this.videoRef || !this.videoRef.current) return;
      
      try {
        const detections = await faceapi
          .detectAllFaces(this.videoRef.current, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5
          }))
          .withFaceExpressions();
        
        // Clear canvas first
        const ctx = this.canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);
        
        if (detections && detections.length > 0) {
          // Track multiple faces for visual feedback
          this.multipleFacesDetected = detections.length > 1;
          
          // Find the largest face (most prominent)
          let primaryFace = detections[0];
          if (detections.length > 1) {
            primaryFace = detections.reduce((largest, current) => {
              const largestArea = largest.detection.box.width * largest.detection.box.height;
              const currentArea = current.detection.box.width * current.detection.box.height;
              return currentArea > largestArea ? current : largest;
            });
          }
          
          // Reset counters for successful detection
          this.consecutiveNoDetections = 0;
          this.lastDetectionTime = Date.now();
          
          // Get strongest emotion from the primary (largest) face
          const expressions = primaryFace.expressions;
          const emotion = Object.keys(expressions).reduce((a, b) => 
            expressions[a] > expressions[b] ? a : b
          );
          
          const confidence = expressions[emotion];
          
          // Store last detected emotion
          this.lastEmotion = emotion;
          
          // Notify callback about detected emotion with face detection = true
          if (this.onEmotionDetected && confidence > this.emotionConfidenceThreshold) {
            this.onEmotionDetected(emotion, confidence, true);
          }
          
          // Draw results on canvas with enhanced visualization
          const resizedDetections = faceapi.resizeResults([primaryFace], displaySize);
          
          // Draw face detection box with emotion-based color
          const emotionColors = {
            happy: '#FFD700',
            sad: '#4682B4',
            angry: '#FF4500',
            fearful: '#800080',
            disgusted: '#006400',
            surprised: '#FF69B4',
            neutral: '#A9A9A9'
          };
          
          // Custom drawing for the primary face
          const detection = resizedDetections[0];
          const { x, y, width, height } = detection.detection.box;
          
          // Draw primary face box with emotion color and thicker border
          ctx.strokeStyle = emotionColors[emotion] || emotionColors.neutral;
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, width, height);
          
          // Draw "PRIMARY FACE" label
          ctx.fillStyle = emotionColors[emotion] || emotionColors.neutral;
          ctx.font = 'bold 18px Arial';
          ctx.fillText(
            `${emotion.toUpperCase()} (${(confidence * 100).toFixed(0)}%)`,
            x,
            y - 15
          );
          
          // Draw emotion confidence bars for primary face
          const barWidth = width / Object.keys(expressions).length;
          let barX = x;
          
          Object.entries(expressions).forEach(([expr, conf]) => {
            const barHeight = conf * height * 0.3;
            ctx.fillStyle = emotionColors[expr] || emotionColors.neutral;
            ctx.globalAlpha = conf;
            ctx.fillRect(barX, y + height - barHeight, barWidth - 2, barHeight);
            ctx.globalAlpha = 1;
            barX += barWidth;
          });
          
          // Draw indicators for other faces (if any)
          if (this.multipleFacesDetected) {
            detections.forEach((face, index) => {
              if (face === primaryFace) return; // Skip primary face
              
              const otherBox = face.detection.box;
              const scaledBox = faceapi.resizeResults([face], displaySize)[0].detection.box;
              
              // Draw lighter box for secondary faces
              ctx.strokeStyle = '#666666';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]); // Dashed line
              ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);
              ctx.setLineDash([]); // Reset line dash
              
              // Draw "IGNORED" label
              ctx.fillStyle = '#666666';
              ctx.font = '12px Arial';
              ctx.fillText(
                'IGNORED',
                scaledBox.x,
                scaledBox.y - 5
              );
            });
            
            // Draw multiple faces warning
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
              `⚠️ ${detections.length} GEZICHTEN - GROOTSTE WORDT GEBRUIKT`,
              displaySize.width / 2,
              30
            );
            ctx.textAlign = 'left';
          }
          
        } else {
          // No face detected
          this.consecutiveNoDetections++;
          this.multipleFacesDetected = false; // Reset multiple faces flag
          
          // After 3 consecutive no-detections, notify that no face is found
          if (this.consecutiveNoDetections >= 3) {
            if (this.onEmotionDetected) {
              this.onEmotionDetected(this.lastEmotion, 0, false);
            }
          }
          
          // Draw "no face detected" indicator
          ctx.fillStyle = '#ff6b6b';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(
            'Geen gezicht gedetecteerd',
            displaySize.width / 2,
            displaySize.height / 2
          );
          ctx.fillStyle = '#ffaaaa';
          ctx.font = '16px Arial';
          ctx.fillText(
            'Kijk naar de camera',
            displaySize.width / 2,
            displaySize.height / 2 + 30
          );
          ctx.textAlign = 'left';
        }
      } catch (error) {
        console.error('Fout tijdens gezichtsdetectie:', error);
        
        // On error, treat as no face detected
        this.consecutiveNoDetections++;
        this.multipleFacesDetected = false; // Reset multiple faces flag
        if (this.consecutiveNoDetections >= 5 && this.onEmotionDetected) {
          this.onEmotionDetected(this.lastEmotion, 0, false);
        }
      }
    }, 200); // Faster detection for better responsiveness
  }

  // Stop detection
  stopDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  // Get current detection status
  isDetecting() {
    return this.detectionInterval !== null;
  }

  // Get time since last successful detection
  getTimeSinceLastDetection() {
    return Date.now() - this.lastDetectionTime;
  }

  // Set emotion confidence threshold
  setConfidenceThreshold(threshold) {
    this.emotionConfidenceThreshold = Math.max(0.1, Math.min(1.0, threshold));
  }

  // Check if multiple faces are currently detected
  hasMultipleFaces() {
    return this.multipleFacesDetected;
  }

  // Get detailed detection status
  getDetectionStatus() {
    return {
      isDetecting: this.isDetecting(),
      timeSinceLastDetection: this.getTimeSinceLastDetection(),
      hasMultipleFaces: this.multipleFacesDetected,
      lastEmotion: this.lastEmotion,
      consecutiveNoDetections: this.consecutiveNoDetections
    };
  }
}