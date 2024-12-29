import * as faceapi from 'face-api.js';

class VideoAnalysisService {
    constructor() {
        this.isModelLoaded = false;
        this.analysisData = {
            expressions: [],
            headPose: [],
            eyeMovements: [],
            suspiciousActivities: []
        };
        this.modelBasePath = '/models';
        this.consecutiveFailures = 0;
        this.maxFailures = 3;
    }

    async loadModels() {
        try {
            const modelUrls = {
                tinyFaceDetector: `${this.modelBasePath}/tiny_face_detector_model-weights_manifest.json`,
                faceLandmark68Net: `${this.modelBasePath}/face_landmark_68_model-weights_manifest.json`,
                faceRecognitionNet: `${this.modelBasePath}/face_recognition_model-weights_manifest.json`,
                faceExpressionNet: `${this.modelBasePath}/face_expression_model-weights_manifest.json`
            };

            // Verify model files exist before loading
            await this.verifyModels(modelUrls);

            // Load models in parallel
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(this.modelBasePath),
                faceapi.nets.faceLandmark68Net.loadFromUri(this.modelBasePath),
                faceapi.nets.faceRecognitionNet.loadFromUri(this.modelBasePath),
                faceapi.nets.faceExpressionNet.loadFromUri(this.modelBasePath)
            ]);

            this.isModelLoaded = true;
            console.log('Face analysis models loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading face analysis models:', error);
            throw new Error('Failed to load face analysis models. Please check your internet connection and try again.');
        }
    }

    async verifyModels(modelUrls) {
        const verifyPromises = Object.entries(modelUrls).map(async ([name, url]) => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${name} model`);
            }
            return true;
        });

        await Promise.all(verifyPromises);
    }

    async analyzeFacialBehavior(videoElement, onFrame) {
        if (!this.isModelLoaded) {
            throw new Error('Face analysis models not loaded');
        }

        if (!videoElement || videoElement.readyState !== 4) {
            throw new Error('Video element not ready');
        }

        try {
            const analysis = {
                lookAway: 0,
                suspiciousMovements: 0,
                expressionChanges: 0,
                totalFrames: 0
            };

            const detections = await faceapi
                .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();

            if (detections.length === 0) {
                this.consecutiveFailures++;
                if (this.consecutiveFailures >= this.maxFailures) {
                    throw new Error('No face detected in multiple consecutive frames');
                }
                return this.getEmptyAnalysis();
            }

            this.consecutiveFailures = 0;
            const detection = detections[0];
            
            // Process facial data
            const processedData = this.processFacialData(detection);
            Object.assign(analysis, processedData);

            // Store analysis data
            this.storeAnalysisData(processedData);

            analysis.totalFrames++;
            
            if (onFrame && typeof onFrame === 'function') {
                onFrame(analysis);
            }

            return analysis;
        } catch (error) {
            console.error('Frame analysis error:', error);
            return this.getEmptyAnalysis();
        }
    }

    processFacialData(detection) {
        const landmarks = detection.landmarks;
        const expressions = detection.expressions;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        
        return {
            lookingAway: this.isLookingAway(leftEye, rightEye),
            suspiciousMovement: this.detectSuspiciousMovement(landmarks),
            expressionChange: this.detectExpressionChange(expressions),
            confidence: this.calculateConfidence(detection)
        };
    }

    isLookingAway(leftEye, rightEye) {
        const eyeCenter = {
            x: (leftEye[0].x + rightEye[3].x) / 2,
            y: (leftEye[0].y + rightEye[3].y) / 2
        };
        
        const threshold = 0.2;
        return Math.abs(eyeCenter.x) > threshold || Math.abs(eyeCenter.y) > threshold;
    }

    detectSuspiciousMovement(landmarks) {
        const nose = landmarks.getNose();
        const movement = this.calculateMovement(nose[0]);
        const threshold = 20;
        return movement > threshold;
    }

    detectExpressionChange(expressions) {
        if (this.analysisData.expressions.length === 0) {
            this.analysisData.expressions.push(expressions);
            return false;
        }

        const previousExpressions = this.analysisData.expressions[this.analysisData.expressions.length - 1];
        const threshold = 0.3;

        for (const expression in expressions) {
            if (Math.abs(expressions[expression] - previousExpressions[expression]) > threshold) {
                return true;
            }
        }

        this.analysisData.expressions.push(expressions);
        if (this.analysisData.expressions.length > 30) {
            this.analysisData.expressions.shift();
        }

        return false;
    }

    calculateConfidence(detection) {
        const expressionConfidence = Math.max(...Object.values(detection.expressions));
        const landmarkConfidence = detection.landmarks.positions.reduce((acc, pos) => 
            acc + (pos.confidence || 1), 0) / detection.landmarks.positions.length;
        
        return (expressionConfidence + landmarkConfidence) / 2;
    }

    getEmptyAnalysis() {
        return {
            lookAway: 0,
            suspiciousMovements: 0,
            expressionChanges: 0,
            totalFrames: 1,
            confidence: 0
        };
    }

    generateAnalysisReport(analysisData) {
        return {
            suspicionScore: this.calculateSuspicionScore(analysisData),
            details: this.generateDetailsReport(analysisData),
            flags: this.generateWarningFlags(analysisData),
            recommendations: this.generateRecommendations(analysisData)
        };
    }

    calculateSuspicionScore(analysisData) {
        if (!analysisData || !analysisData.totalFrames) return 0;

        const weights = {
            lookAway: 0.4,
            suspiciousMovements: 0.3,
            expressionChanges: 0.3
        };

        return Math.min(100, Math.round(
            (weights.lookAway * (analysisData.lookAway / analysisData.totalFrames) +
            weights.suspiciousMovements * (analysisData.suspiciousMovements / analysisData.totalFrames) +
            weights.expressionChanges * (analysisData.expressionChanges / analysisData.totalFrames)) * 100
        ));
    }

    reset() {
        this.analysisData = {
            expressions: [],
            headPose: [],
            eyeMovements: [],
            suspiciousActivities: []
        };
        this.consecutiveFailures = 0;
    }

    // Helper methods for data storage and retrieval
    storeAnalysisData(data) {
        // Implement storage logic here if needed
        // This could be used for generating more detailed reports
    }

    // Additional helper methods as needed
    calculateMovement(point) {
        if (!this.lastPoint) {
            this.lastPoint = point;
            return 0;
        }

        const movement = Math.sqrt(
            Math.pow(point.x - this.lastPoint.x, 2) + 
            Math.pow(point.y - this.lastPoint.y, 2)
        );

        this.lastPoint = point;
        return movement;
    }
}

export default VideoAnalysisService;