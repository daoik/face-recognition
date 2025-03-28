import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import './App.css';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [detectionResults, setDetectionResults] = useState([]);
  const [showNodes, setShowNodes] = useState(true);
  const [detectionHistory, setDetectionHistory] = useState([]); // Store detection history
  const [medianResults, setMedianResults] = useState([]); // Store median results
  
  // References for detection state
  const lastDetectionTimeRef = useRef(0);
  const lastResultsRef = useRef([]);
  const processingRef = useRef(false);
  const animationRef = useRef(null);
  const frameCountRef = useRef(0); // New ref for frame count
  
  // Settings for detection frequency and smoothing
  const DETECTION_INTERVAL = 100; // ms between detections
  const SMOOTHING_FACTOR = 0.5; // Higher = more smoothing (0-1)

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = process.env.PUBLIC_URL + '/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        
        setModelsLoaded(true);
      } catch (err) {
        setError('Error loading models: ' + err.message);
        console.error('Error loading models:', err);
      }
    };
    loadModels();
    
    // Cleanup animation frame on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (detectionHistory.length > 0) {
      setMedianResults(calculateMedianResults(detectionHistory));
    }
  }, [detectionHistory]);

  const handleVideoLoad = () => {
    if (webcamRef.current && webcamRef.current.video) {
      const video = webcamRef.current.video;
      setDimensions({
        width: video.videoWidth,
        height: video.videoHeight
      });
    }
  };
  
  // Function to smooth values between frames
  const smoothValue = (newValue, oldValue) => {
    if (oldValue === undefined) return newValue;
    return oldValue * SMOOTHING_FACTOR + newValue * (1 - SMOOTHING_FACTOR);
  };
  
  // Updated drawing function with cybernetic sigil marks
  const drawDetections = (ctx, canvas, detections) => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw mystical background sigil pattern
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Draw digital sigil grid
    for (let i = 0; i < canvas.width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    
    for (let i = 0; i < canvas.height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
    
    if (!detections || detections.length === 0) return;
    
    // Draw each detection
    detections.forEach(detection => {
      // Handle different detection object structures
      let box, age, gender, genderProb, expressions, emotion, beautyScore, landmarks;
      
      // Handle direct detection format from our app
      if (detection.box) {
        box = detection.box;
        age = detection.age;
        gender = detection.gender;
        emotion = detection.emotion;
        beautyScore = detection.beautyScore;
        landmarks = detection.landmarks;
      } 
      // Handle face-api.js format with detection property
      else if (detection.detection) {
        box = detection.detection.box;
        age = detection.age;
        gender = detection.gender;
        genderProb = detection.genderProbability;
        expressions = detection.expressions;
        beautyScore = detection.beautyScore;
        landmarks = detection.landmarks;
      } else {
        // Skip if no valid box data
        return;
      }
      
      // Define primary colors in cyber sigil palette
      const primaryColor = '#ff00aa';
      const secondaryColor = '#0ff';
      
      // Mirror X coordinate for webcam mirroring
      const mirroredX = canvas.width - box.x - box.width;
      
      // Draw detection box with sigil-like corners
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 2;
      
      // First draw a full rectangle with slight transparency for easier tracking
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
      ctx.strokeRect(mirroredX, box.y, box.width, box.height);
      
      // Then draw corner elements with full opacity
      ctx.strokeStyle = secondaryColor;
      
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(mirroredX, box.y + 15);
      ctx.lineTo(mirroredX, box.y);
      ctx.lineTo(mirroredX + 15, box.y);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(mirroredX + box.width - 15, box.y);
      ctx.lineTo(mirroredX + box.width, box.y);
      ctx.lineTo(mirroredX + box.width, box.y + 15);
      ctx.stroke();
      
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(mirroredX, box.y + box.height - 15);
      ctx.lineTo(mirroredX, box.y + box.height);
      ctx.lineTo(mirroredX + 15, box.y + box.height);
      ctx.stroke();
      
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(mirroredX + box.width - 15, box.y + box.height);
      ctx.lineTo(mirroredX + box.width, box.y + box.height);
      ctx.lineTo(mirroredX + box.width, box.y + box.height - 15);
      ctx.stroke();
      
      // Add small sigils at each corner
      ctx.font = '14px "Share Tech Mono"';
      ctx.fillStyle = primaryColor;
      ctx.fillText('◈', mirroredX - 7, box.y - 7);
      ctx.fillText('◎', mirroredX + box.width + 7, box.y - 7);
      ctx.fillText('⦿', mirroredX - 7, box.y + box.height + 7);
      ctx.fillText('⧫', mirroredX + box.width + 7, box.y + box.height + 7);
      
      // Draw labels with cyber styling
      const labelY = box.y > 40 ? box.y - 100 : box.y + box.height + 30;
      
      // Add a background for text that contains all info
      ctx.fillStyle = 'rgba(10, 10, 30, 0.9)'; // Darker for better visibility
      const textBoxHeight = 110; // Increased height to fit all text
      ctx.fillRect(mirroredX - 5, labelY - 20, box.width + 10, textBoxHeight);
      
      // Add a glowing effect border
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(mirroredX - 5, labelY - 20, box.width + 10, textBoxHeight);
      
      // Add gender and age with cyan color
      ctx.fillStyle = secondaryColor;
      ctx.font = '14px "Share Tech Mono"'; // Increased font size
      
      // Handle different data formats - all text in the same box
      const textX = mirroredX + 10;
      if (gender && age) {
        ctx.fillText(`${Math.round(age)} yr | ${gender}`, textX, labelY);
      }
      
      // Add emotion with magenta color
      ctx.fillStyle = primaryColor;
      if (emotion) {
        ctx.fillText(`Emotion: ${emotion}`, textX, labelY + 30);
      } else if (expressions) {
        // Find the most likely expression from expressions object
        const dominantEmotion = Object.entries(expressions)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 1)
          .map(([emotion, probability]) => `${emotion} (${Math.round(probability * 100)}%)`)
          .join(', ');
        
        ctx.fillText(`Emotion: ${dominantEmotion}`, textX, labelY + 30);
      }
      
      // Add beauty score with star rating
      if (beautyScore) {
        const scoreNum = parseFloat(beautyScore);
        const stars = '★'.repeat(Math.min(Math.round(scoreNum), 5)) + '☆'.repeat(5 - Math.min(Math.round(scoreNum), 5));
        ctx.fillStyle = secondaryColor;
        ctx.fillText(`Beauty: ${scoreNum.toFixed(1)}/10`, textX, labelY + 60);
      }
      
      // Draw facial landmark nodes if landmarks are available
      if (landmarks && showNodes) {
        try {
          // Get landmarks positions from face-api.js format
          // face-api.js can return landmarks in different formats depending on the detection method
          let positions = [];
          
          if (Array.isArray(landmarks)) {
            positions = landmarks;
          } else if (landmarks.positions) {
            positions = landmarks.positions;
          } else if (landmarks.getPositions) {
            positions = landmarks.getPositions();
          } else {
            console.error('Unknown landmark format:', landmarks);
            return;
          }
          
          // Draw facial landmark nodes with cyber sigil styling
          positions.forEach((position, index) => {
            // Skip if position is undefined or missing coordinates
            if (!position || position.x === undefined || position.y === undefined) return;
            
            // Mirror X coordinate for webcam mirroring
            const mirroredX = canvas.width - position.x;
            
            // Determine node color based on landmark group with reduced opacity
            let nodeColor;
            
            // Jawline: 0-16
            if (index <= 16) {
              nodeColor = 'rgba(255, 0, 170, 0.3)';
            } 
            // Eyebrows: 17-26
            else if (index <= 26) {
              nodeColor = 'rgba(0, 255, 255, 0.3)';
            }
            // Nose: 27-35
            else if (index <= 35) {
              nodeColor = 'rgba(255, 255, 0, 0.3)';
            }
            // Eyes: 36-47
            else if (index <= 47) {
              nodeColor = 'rgba(0, 255, 255, 0.3)';
            }
            // Lips: 48-67
            else {
              nodeColor = 'rgba(255, 0, 170, 0.3)';
            }
            
            // Draw node as small diamond with glowing effect
            ctx.fillStyle = nodeColor;
            ctx.beginPath();
            ctx.moveTo(mirroredX, position.y - 2); 
            ctx.lineTo(mirroredX + 2, position.y);
            ctx.lineTo(mirroredX, position.y + 2);
            ctx.lineTo(mirroredX - 2, position.y);
            ctx.closePath();
            ctx.fill();
            
            // Add glow effect
            ctx.shadowColor = nodeColor;
            ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowBlur = 0;
          });
          
          // Define facial feature connections for a more detailed mesh
          const connections = [
            // Jawline
            Array.from({length: 16}, (_, i) => [i, i+1]),
            // Eyebrows
            Array.from({length: 4}, (_, i) => [17+i, 18+i]),
            Array.from({length: 4}, (_, i) => [22+i, 23+i]),
            // Nose bridge
            Array.from({length: 3}, (_, i) => [27+i, 28+i]),
            // Nose bottom
            [[30, 31], [31, 32], [32, 33], [33, 34], [34, 35], [35, 30]],
            // Left eye
            [[36, 37], [37, 38], [38, 39], [39, 40], [40, 41], [41, 36]],
            // Right eye
            [[42, 43], [43, 44], [44, 45], [45, 46], [46, 47], [47, 42]],
            // Outer lips
            Array.from({length: 11}, (_, i) => [i+48, i+49]),
            [[59, 48]],
            // Inner lips
            Array.from({length: 7}, (_, i) => [i+60, i+61]),
            [[67, 60]]
          ];
          
          // Draw connections
          ctx.lineWidth = 1;
          connections.forEach(group => {
            group.forEach(([start, end]) => {
              if (start < positions.length && end < positions.length) {
                const startPoint = positions[start];
                const endPoint = positions[end];
                
                if (startPoint && endPoint && 
                    startPoint.x !== undefined && startPoint.y !== undefined &&
                    endPoint.x !== undefined && endPoint.y !== undefined) {
                  // Mirror X coordinates for the mirrored webcam
                  const mirroredStartX = canvas.width - startPoint.x;
                  const mirroredEndX = canvas.width - endPoint.x;
                  
                  ctx.beginPath();
                  ctx.moveTo(mirroredStartX, startPoint.y);
                  ctx.lineTo(mirroredEndX, endPoint.y);
                  ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)'; // Reduced opacity to match nodes
                  ctx.stroke();
                }
              }
            });
          });
        } catch (err) {
          console.error('Error drawing landmarks:', err);
        }
      }
    });
  };

  const startFaceDetection = async () => {
    if (!webcamRef.current?.video || !modelsLoaded || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    
    // Make sure we have the video dimensions
    handleVideoLoad();
    
    // Set up canvas size
    const displaySize = {
      width: video.clientWidth,
      height: video.clientHeight
    };
    
    // Match canvas size to video display size
    if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
      canvas.width = displaySize.width;
      canvas.height = displaySize.height;
    }
    
    const ctx = canvas.getContext('2d');

    const renderFrame = async () => {
      // Check if we need to run detection based on interval
      const now = Date.now();
      const shouldDetect = !processingRef.current && 
                           (now - lastDetectionTimeRef.current > DETECTION_INTERVAL) && 
                           video.readyState === 4;
      
      if (shouldDetect) {
        processingRef.current = true;
        lastDetectionTimeRef.current = now;
        
        try {
          // Get face detections
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();
          
          // Resize detections to match display size
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          
          // Process each detection
          const newResults = resizedDetections.map(detection => {
            const { age, gender, genderProbability, expressions } = detection;
            const box = detection.detection.box;
            const landmarks = detection.landmarks.positions;
            
            // Get dominant expression with confidence
            const dominantExpression = Object.entries(expressions)
              .reduce((prev, current) => 
                prev[1] > current[1] ? prev : current
              );
            
            const expressionName = dominantExpression[0];
            const expressionConfidence = Math.round(dominantExpression[1] * 100);
            
            // Format gender with confidence
            const genderText = `${gender} (${Math.round(genderProbability * 100)}%)`;
            
            // Calculate beauty score based on facial symmetry and proportions
            const beautyScore = calculateBeautyScore(landmarks);
            
            return {
              box,
              age,
              gender: genderText,
              emotion: `${expressionName} (${expressionConfidence}%)`,
              expressionName,
              expressionConfidence,
              beautyScore,
              landmarks,
              type: 'human'
            };
          });
          
          // Apply smoothing between frames
          let smoothedResults = newResults;
          
          if (lastResultsRef.current.length > 0) {
            // Try to match detections between frames
            smoothedResults = newResults.map((result, i) => {
              // Find closest previous detection (simple approach)
              const prevResult = lastResultsRef.current[i];
              
              if (!prevResult) return result;
              
              // Apply smoothing to all values
              return {
                ...result,
                box: {
                  x: smoothValue(result.box.x, prevResult.box.x),
                  y: smoothValue(result.box.y, prevResult.box.y),
                  width: smoothValue(result.box.width, prevResult.box.width),
                  height: smoothValue(result.box.height, prevResult.box.height)
                },
                age: smoothValue(result.age, prevResult.age),
                // Apply smoothing to landmarks positions if available
                landmarks: result.landmarks && prevResult.landmarks ? 
                  result.landmarks.map((landmark, i) => {
                    if (!prevResult.landmarks[i]) return landmark;
                    return {
                      x: smoothValue(landmark.x, prevResult.landmarks[i].x),
                      y: smoothValue(landmark.y, prevResult.landmarks[i].y)
                    };
                  }) : result.landmarks
              };
            });
          }
          
          // Update state and refs
          lastResultsRef.current = smoothedResults;
          setDetectionResults(smoothedResults);
          
          // Update history for median calculation without creating state update loops
          // Only update history every few frames to avoid performance issues
          if (frameCountRef.current % 5 === 0) {
            setDetectionHistory(prevHistory => {
              const newHistory = [...prevHistory, smoothedResults];
              // Keep only last 30 entries to prevent memory issues
              return newHistory.slice(-30);
            });
          }
          frameCountRef.current++;
        } catch (err) {
          console.error('Detection error:', err);
        }
        
        processingRef.current = false;
      }
      
      // Always draw the latest results, even if we didn't run detection this frame
      drawDetections(ctx, canvas, lastResultsRef.current);
      
      // Continue animation loop
      animationRef.current = requestAnimationFrame(renderFrame);
    };

    // Start the animation loop
    renderFrame();
  };

  // Function to calculate beauty score based on facial symmetry and proportions
  const calculateBeautyScore = (landmarks) => {
    if (!landmarks || landmarks.length < 68) return 0;
    
    try {
      // Calculate facial symmetry
      const symmetryScore = calculateSymmetry(landmarks);
      
      // Calculate facial proportions (golden ratio approximation)
      const proportionScore = calculateProportions(landmarks);
      
      // Combine scores (weighted average)
      const beautyScore = Math.round((symmetryScore * 0.6 + proportionScore * 0.4) * 10);
      
      // Ensure score is between 1-10
      return Math.max(1, Math.min(10, beautyScore));
    } catch (err) {
      console.error('Error calculating beauty score:', err);
      return 5; // Default middle score
    }
  };

  // Calculate facial symmetry by comparing left and right sides
  const calculateSymmetry = (landmarks) => {
    // Face midpoint (nose bridge is usually point 27)
    const midpoint = landmarks[27].x;
    
    // Key symmetry points to compare (eyebrows, eyes, cheeks, lips)
    const symmetryPairs = [
      [0, 16],   // Jaw line
      [1, 15],   // Jaw line
      [2, 14],   // Jaw line
      [3, 13],   // Jaw line
      [4, 12],   // Jaw line
      [5, 11],   // Jaw line
      [6, 10],   // Jaw line
      [17, 26],  // Eyebrows
      [18, 25],  // Eyebrows
      [19, 24],  // Eyebrows
      [20, 23],  // Eyebrows
      [21, 22],  // Eyebrows
      [36, 45],  // Eyes
      [37, 44],  // Eyes
      [38, 43],  // Eyes
      [39, 42],  // Eyes
      [40, 47],  // Eyes
      [41, 46],  // Eyes
      [48, 54],  // Lips
      [49, 53],  // Lips
      [50, 52],  // Lips
      [59, 55],  // Lips
      [58, 56],  // Lips
    ];
    
    // Calculate average symmetry
    let totalDifference = 0;
    
    symmetryPairs.forEach(([leftIdx, rightIdx]) => {
      const leftPoint = landmarks[leftIdx];
      const rightPoint = landmarks[rightIdx];
      
      // Calculate distance from midpoint
      const leftDistance = Math.abs(midpoint - leftPoint.x);
      const rightDistance = Math.abs(rightPoint.x - midpoint);
      
      // Calculate vertical alignment
      const verticalDiff = Math.abs(leftPoint.y - rightPoint.y);
      
      // Calculate symmetry difference (normalized)
      const horizontalSymmetry = 1 - Math.abs(leftDistance - rightDistance) / Math.max(leftDistance, rightDistance);
      const verticalSymmetry = 1 - verticalDiff / 20; // Normalize by typical face height
      
      totalDifference += (horizontalSymmetry * 0.7 + verticalSymmetry * 0.3);
    });
    
    // Return normalized score (0-1)
    return totalDifference / symmetryPairs.length;
  };

  // Calculate facial proportions based on golden ratio and other aesthetic principles
  const calculateProportions = (landmarks) => {
    // Key measurements
    // 1. Eyes width to face width ratio
    const faceWidth = Math.abs(landmarks[16].x - landmarks[0].x);
    const eyeDistance = Math.abs(landmarks[39].x - landmarks[42].x);
    const eyeToFaceRatio = eyeDistance / faceWidth;
    const idealEyeRatio = 0.46; // Ideal ratio
    
    // 2. Face length to width ratio
    const faceHeight = Math.abs(landmarks[8].y - landmarks[27].y);
    const lengthToWidthRatio = faceHeight / faceWidth;
    const idealLWRatio = 1.618; // Golden ratio
    
    // 3. Mouth width to nose width
    const mouthWidth = Math.abs(landmarks[54].x - landmarks[48].x);
    const noseWidth = Math.abs(landmarks[35].x - landmarks[31].x);
    const mouthToNoseRatio = mouthWidth / noseWidth;
    const idealMouthRatio = 1.618; // Golden ratio
    
    // Calculate how close each ratio is to the ideal (1.0 = perfect)
    const eyeRatioScore = 1 - Math.abs(eyeToFaceRatio - idealEyeRatio) / idealEyeRatio;
    const lwRatioScore = 1 - Math.abs(lengthToWidthRatio - idealLWRatio) / idealLWRatio;
    const mouthRatioScore = 1 - Math.abs(mouthToNoseRatio - idealMouthRatio) / idealMouthRatio;
    
    // Weighted average of proportion scores
    return (eyeRatioScore * 0.3 + lwRatioScore * 0.4 + mouthRatioScore * 0.3);
  };

  // Function to reset statistics
  const resetStatistics = () => {
    setDetectionHistory([]);
    setMedianResults([]);
    frameCountRef.current = 0;
  };

  // Calculate median results from detection history
  const calculateMedianResults = (history) => {
    if (!history || history.length === 0) return [];
    
    // Keep only the last 30 frames to prevent memory issues
    const recentHistory = history.slice(-30);
    
    // Create separate arrays for each property
    const ages = [];
    const genders = {};
    const emotions = {};
    const beautyScores = [];
    
    // Extract all values into their respective arrays/objects
    recentHistory.forEach(frameResults => {
      if (!frameResults || frameResults.length === 0) return;
      
      // We'll use the first face detected in each frame
      const face = frameResults[0];
      if (!face) return;
      
      // Add age to age array
      if (face.age !== undefined) {
        ages.push(face.age);
      }
      
      // Count gender occurrences
      if (face.gender) {
        genders[face.gender] = (genders[face.gender] || 0) + 1;
      }
      
      // Count emotion occurrences
      if (face.emotion) {
        emotions[face.emotion] = (emotions[face.emotion] || 0) + 1;
      }
      
      // Add beauty score to beauty array
      if (face.beautyScore !== undefined) {
        beautyScores.push(face.beautyScore);
      }
    });
    
    // Calculate median age
    const medianAge = calculateMedian(ages);
    
    // Get most frequent gender
    const medianGender = getMostFrequent(genders);
    
    // Get most frequent emotion
    const medianEmotion = getMostFrequent(emotions);
    
    // Calculate median beauty score
    const medianBeautyScore = calculateMedian(beautyScores);
    
    return [{
      age: medianAge,
      gender: medianGender,
      emotion: medianEmotion,
      beautyScore: medianBeautyScore
    }];
  };
  
  // Helper function to calculate median of an array
  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return 0;
    
    const sorted = [...arr].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  };
  
  // Helper function to get most frequent value
  const getMostFrequent = (obj) => {
    if (!obj || Object.keys(obj).length === 0) return '';
    
    return Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b);
  };

  return (
    <div className="App">
      {/* Add decorative corner sigils for full cyber sigilism aesthetic */}
      <div className="cyber-corner corner-tl"></div>
      <div className="cyber-corner corner-tr"></div>
      <div className="cyber-corner corner-bl"></div>
      <div className="cyber-corner corner-br"></div>
      
      <header className="App-header">
        <p className="cyber-subtitle">╠══ Bio-Recognition System ══╣</p>
        
        {error && <div className="error-message">{error}</div>}
        <div className="webcam-container">
          <div className="corner-sigil top-left">
            ◈
          </div>
          <div className="corner-sigil top-right">
            ◎
          </div>
          <div className="corner-sigil bottom-left">
            ⦿
          </div>
          <div className="corner-sigil bottom-right">
            ⧫
          </div>

          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            mirrored={true}
            onLoadedData={handleVideoLoad}
            style={{
              width: '100%',
              maxWidth: '640px',
              height: 'auto',
              borderRadius: '4px'
            }}
            onPlay={() => {
              if (modelsLoaded) startFaceDetection();
            }}
          />
          <canvas
            ref={canvasRef}
            className="face-canvas"
          />
        </div>
        
        {/* Display median results with cyber sigilism styling */}
        {medianResults.length > 0 && (
          <div className="detection-results">
            <h3>┌─── Dimensional Analysis ───┐</h3>
            {medianResults.map((result, index) => (
              <div key={index} className="detection-item">
                <p><strong>ᛝ Entity:</strong> Human</p>
                <p><strong>ᛟ Age:</strong> {Math.round(result.age)} years</p>
                <p><strong>ᚨ Gender:</strong> {result.gender}</p>
                <p><strong>ᚷ Emotion:</strong> {result.emotion}</p>
                <p><strong>ᛉ Beauty Score:</strong> {result.beautyScore ? result.beautyScore.toFixed(1) : "0"}/10</p>
              </div>
            ))}
            <button onClick={resetStatistics}>RESET DATA MATRIX</button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
