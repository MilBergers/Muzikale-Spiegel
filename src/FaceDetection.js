import * as faceapi from 'face-api.js';

export default class FaceDetection {
  constructor(onEmotionDetected) {
    this.videoRef = null;
    this.canvasRef = null;
    this.detectionInterval = null;
    this.isModelLoaded = false;
    this.onEmotionDetected = onEmotionDetected;
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
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
    
    // Run face detection every 300ms to avoid too many updates
    this.detectionInterval = setInterval(async () => {
      if (!this.videoRef || !this.videoRef.current) return;
      
      try {
        const detections = await faceapi
          .detectAllFaces(this.videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();
        
        if (detections && detections.length > 0) {
          // Get strongest emotion
          const expressions = detections[0].expressions;
          const emotion = Object.keys(expressions).reduce((a, b) => 
            expressions[a] > expressions[b] ? a : b
          );
          
          const confidence = expressions[emotion];
          
          // Notify callback about detected emotion
          if (this.onEmotionDetected && confidence > 0.5) {
            this.onEmotionDetected(emotion, confidence);
          }
          
          // Draw results on canvas
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const ctx = this.canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);
          faceapi.draw.drawDetections(this.canvasRef.current, resizedDetections);
          faceapi.draw.drawFaceExpressions(this.canvasRef.current, resizedDetections);
        }
      } catch (error) {
        console.error('Fout tijdens gezichtsdetectie:', error);
      }
    }, 300);
  }

  // Stop detection
  stopDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }
}