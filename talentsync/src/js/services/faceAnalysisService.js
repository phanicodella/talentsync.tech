// src/js/services/faceAnalysisService.js
class FaceAnalysisService {
    constructor() {
        this.isModelLoaded = false;
        this.lastFrameTime = Date.now();
        this.frameCounter = 0;
        this.suspiciousActivityCount = 0;
        this.outOfFrameCount = 0;
    }

    async initialize() {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.load('/models'),
                faceapi.nets.faceLandmark68Net.load('/models'),
                faceapi.nets.faceExpressionNet.load('/models')
            ]);
            this.isModelLoaded = true;
            console.log('Face models loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading face models:', error);
            throw new Error('Failed to load face detection models');
        }
    }

    async analyzeFrame(videoElement) {
        if (!this.isModelLoaded) {
            throw new Error('Face models not loaded');
        }

        const now = Date.now();
        if (now - this.lastFrameTime < 100) { // Limit to 10 FPS
            return null;
        }
        this.lastFrameTime = now;

        try {
            const detection = await faceapi.detectSingleFace(
                videoElement,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceExpressions();

            if (!detection) {
                this.outOfFrameCount++;
                return {
                    status: 'not_detected',
                    outOfFrameCount: this.outOfFrameCount,
                    message: 'No face detected'
                };
            }

            const analysis = this.analyzeBehavior(detection);
            this.frameCounter++;

            return {
                status: 'detected',
                analysis,
                frameCount: this.frameCounter,
                outOfFrameCount: this.outOfFrameCount,
                suspiciousCount: this.suspiciousActivityCount
            };
        } catch (error) {
            console.error('Frame analysis error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    analyzeBehavior(detection) {
        const analysis = {
            attention: this.calculateAttention(detection),
            expressions: detection.expressions,
            headPose: this.estimateHeadPose(detection.landmarks),
            suspiciousActivity: false,
            warnings: []
        };

        // Check for suspicious patterns
        if (analysis.attention < 0.6) {
            analysis.warnings.push('Low attention detected');
            this.suspiciousActivityCount++;
        }

        if (this.isErraticMovement(detection.landmarks)) {
            analysis.warnings.push('Erratic movement detected');
            this.suspiciousActivityCount++;
        }

        if (this.detectUnusualExpressions(detection.expressions)) {
            analysis.warnings.push('Unusual expression patterns');
            this.suspiciousActivityCount++;
        }

        analysis.suspiciousActivity = analysis.warnings.length > 0;

        return analysis;
    }

    calculateAttention(detection) {
        const landmarks = detection.landmarks.positions;
        const eyePoints = landmarks.slice(36, 48); // Eye landmarks
        
        // Calculate eye aspect ratio to detect looking away
        const leftEye = eyePoints.slice(0, 6);
        const rightEye = eyePoints.slice(6, 12);
        
        const leftEAR = this.getEyeAspectRatio(leftEye);
        const rightEAR = this.getEyeAspectRatio(rightEye);
        
        const averageEAR = (leftEAR + rightEAR) / 2;
        return Math.min(Math.max(averageEAR / 0.3, 0), 1); // Normalize between 0 and 1
    }

    getEyeAspectRatio(eye) {
        const verticalDist1 = this.getDistance(eye[1], eye[5]);
        const verticalDist2 = this.getDistance(eye[2], eye[4]);
        const horizontalDist = this.getDistance(eye[0], eye[3]);
        return (verticalDist1 + verticalDist2) / (2 * horizontalDist);
    }

    getDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + 
            Math.pow(point2.y - point1.y, 2)
        );
    }

    estimateHeadPose(landmarks) {
        const nose = landmarks.positions[30];
        const leftEye = landmarks.positions[36];
        const rightEye = landmarks.positions[45];
        
        const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2
        };
        
        return {
            yaw: (nose.x - eyeCenter.x) / (rightEye.x - leftEye.x),
            pitch: (nose.y - eyeCenter.y) / (rightEye.x - leftEye.x)
        };
    }

    isErraticMovement(landmarks) {
        const nose = landmarks.positions[30];
        if (!this.lastNosePosition) {
            this.lastNosePosition = nose;
            return false;
        }

        const movement = this.getDistance(nose, this.lastNosePosition);
        this.lastNosePosition = nose;
        
        return movement > 20; // Threshold for erratic movement
    }

    detectUnusualExpressions(expressions) {
        const dominantExpression = Object.entries(expressions)
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
        
        const unusualExpressions = ['angry', 'disgusted', 'fearful'];
        return unusualExpressions.includes(dominantExpression);
    }

    getAnalysisSummary() {
        return {
            totalFrames: this.frameCounter,
            outOfFramePercentage: (this.outOfFrameCount / this.frameCounter) * 100,
            suspiciousActivityPercentage: (this.suspiciousActivityCount / this.frameCounter) * 100
        };
    }

    reset() {
        this.frameCounter = 0;
        this.suspiciousActivityCount = 0;
        this.outOfFrameCount = 0;
        this.lastNosePosition = null;
    }
}

window.FaceAnalysisService = new FaceAnalysisService();