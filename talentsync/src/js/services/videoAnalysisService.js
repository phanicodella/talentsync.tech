// src/js/services/videoAnalysisService.js
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
    }

    async loadModels() {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                faceapi.nets.faceExpressionNet.loadFromUri('/models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('/models')
            ]);
            this.isModelLoaded = true;
            console.log('Face analysis models loaded successfully');
        } catch (error) {
            console.error('Error loading face analysis models:', error);
            throw new Error('Failed to load face analysis models');
        }
    }

    async analyzeFacialBehavior(videoElement, onFrame) {
        if (!this.isModelLoaded) {
            throw new Error('Face analysis models not loaded');
        }

        const analysis = {
            lookAway: 0,
            suspiciousMovements: 0,
            expressionChanges: 0,
            totalFrames: 0
        };

        const processFrame = async () => {
            const detections = await faceapi.detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();

            if (detections && detections.length > 0) {
                const detection = detections[0];
                
                // Analyze eye movements and head position
                const landmarks = detection.landmarks;
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();
                
                // Check for looking away
                if (this.isLookingAway(leftEye, rightEye)) {
                    analysis.lookAway++;
                }

                // Analyze expressions
                const expressions = detection.expressions;
                this.analysisData.expressions.push(expressions);

                // Check for suspicious rapid expression changes
                if (this.hasRapidExpressionChange(expressions)) {
                    analysis.expressionChanges++;
                }

                // Check for suspicious head movements
                if (this.hasSuspiciousHeadMovement(landmarks)) {
                    analysis.suspiciousMovements++;
                }
            }

            analysis.totalFrames++;
            
            if (onFrame) {
                onFrame(analysis);
            }
        };

        return analysis;
    }

    isLookingAway(leftEye, rightEye) {
        // Calculate eye position relative to face center
        const eyeCenter = {
            x: (leftEye[0].x + rightEye[3].x) / 2,
            y: (leftEye[0].y + rightEye[3].y) / 2
        };
        
        // Define threshold for looking away
        const threshold = 0.2;
        return Math.abs(eyeCenter.x) > threshold || Math.abs(eyeCenter.y) > threshold;
    }

    hasRapidExpressionChange(expressions) {
        if (this.analysisData.expressions.length < 2) return false;
        
        const previousExpressions = this.analysisData.expressions[this.analysisData.expressions.length - 2];
        const expressionThreshold = 0.3;

        return Object.keys(expressions).some(expression => 
            Math.abs(expressions[expression] - previousExpressions[expression]) > expressionThreshold
        );
    }

    hasSuspiciousHeadMovement(landmarks) {
        const nose = landmarks.getNose();
        const movement = this.calculateMovement(nose[0]);
        const threshold = 20; // pixels
        return movement > threshold;
    }

    calculateMovement(point) {
        if (this.lastPoint) {
            const movement = Math.sqrt(
                Math.pow(point.x - this.lastPoint.x, 2) + 
                Math.pow(point.y - this.lastPoint.y, 2)
            );
            this.lastPoint = point;
            return movement;
        }
        this.lastPoint = point;
        return 0;
    }

    generateAnalysisReport(analysis) {
        const suspicionScore = this.calculateSuspicionScore(analysis);
        
        return {
            suspicionScore,
            details: {
                lookAwayPercentage: (analysis.lookAway / analysis.totalFrames) * 100,
                suspiciousMovementsCount: analysis.suspiciousMovements,
                rapidExpressionChanges: analysis.expressionChanges
            },
            flags: this.generateWarningFlags(analysis),
            recommendations: this.generateRecommendations(analysis)
        };
    }

    calculateSuspicionScore(analysis) {
        const weights = {
            lookAway: 0.4,
            suspiciousMovements: 0.3,
            expressionChanges: 0.3
        };

        const normalizedScore = 
            (weights.lookAway * (analysis.lookAway / analysis.totalFrames)) +
            (weights.suspiciousMovements * (analysis.suspiciousMovements / analysis.totalFrames)) +
            (weights.expressionChanges * (analysis.expressionChanges / analysis.totalFrames));

        return Math.min(Math.round(normalizedScore * 100), 100);
    }

    generateWarningFlags(analysis) {
        const flags = [];
        const thresholds = {
            lookAwayPercent: 30,
            suspiciousMovementsPercent: 20,
            expressionChangesPercent: 25
        };

        const lookAwayPercent = (analysis.lookAway / analysis.totalFrames) * 100;
        const suspiciousMovementsPercent = (analysis.suspiciousMovements / analysis.totalFrames) * 100;
        const expressionChangesPercent = (analysis.expressionChanges / analysis.totalFrames) * 100;

        if (lookAwayPercent > thresholds.lookAwayPercent) {
            flags.push('Frequent looking away from camera');
        }
        if (suspiciousMovementsPercent > thresholds.suspiciousMovementsPercent) {
            flags.push('Unusual head movements detected');
        }
        if (expressionChangesPercent > thresholds.expressionChangesPercent) {
            flags.push('Irregular expression patterns detected');
        }

        return flags;
    }

    generateRecommendations(analysis) {
        const recommendations = [];
        const lookAwayPercent = (analysis.lookAway / analysis.totalFrames) * 100;

        if (lookAwayPercent > 30) {
            recommendations.push('Consider conducting a follow-up in-person interview');
        }
        if (analysis.suspiciousMovements > 10) {
            recommendations.push('Review the recorded session carefully for suspicious activities');
        }
        if (analysis.expressionChanges > 15) {
            recommendations.push('Evaluate candidate responses against their facial expressions');
        }

        return recommendations;
    }
}

export default VideoAnalysisService;