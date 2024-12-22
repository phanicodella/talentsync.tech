// src/js/interview-manager.js
import VideoAnalysisService from './services/videoAnalysisService.js';
import config from './config.js';

class InterviewManager {
    constructor() {
        this.videoAnalysisService = new VideoAnalysisService();
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.analysisResults = {
            behavioral: null,
            openai: null
        };
    }

    async initialize() {
        await this.videoAnalysisService.loadModels();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const startBtn = document.getElementById('startInterview');
        const endBtn = document.getElementById('endInterview');

        startBtn.addEventListener('click', () => this.startInterview());
        endBtn.addEventListener('click', () => this.endInterview());
    }

    async startInterview() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 },
                audio: true 
            });

            const videoElement = document.getElementById('localVideo');
            videoElement.srcObject = stream;

            this.mediaRecorder = new MediaRecorder(stream);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => this.processRecording();

            // Start behavioral analysis
            this.startBehavioralAnalysis(videoElement);

            this.mediaRecorder.start();
            this.updateUI('recording');
        } catch (error) {
            console.error('Error starting interview:', error);
            this.showError('Failed to start interview: ' + error.message);
        }
    }

    async startBehavioralAnalysis(videoElement) {
        try {
            const analysisInterval = setInterval(async () => {
                if (this.mediaRecorder?.state === 'recording') {
                    const frameAnalysis = await this.videoAnalysisService.analyzeFacialBehavior(
                        videoElement,
                        this.updateLiveAnalysis.bind(this)
                    );
                    this.updateLiveAnalysis(frameAnalysis);
                } else {
                    clearInterval(analysisInterval);
                }
            }, 1000); // Analyze every second
        } catch (error) {
            console.error('Error in behavioral analysis:', error);
            this.showError('Behavioral analysis error: ' + error.message);
        }
    }

    updateLiveAnalysis(analysis) {
        const liveAnalysisDiv = document.getElementById('liveAnalysis');
        if (!liveAnalysisDiv) return;

        const suspicionScore = this.videoAnalysisService.calculateSuspicionScore(analysis);
        
        liveAnalysisDiv.innerHTML = `
            <div class="alert ${suspicionScore > 50 ? 'alert-warning' : 'alert-info'}">
                <h5>Live Analysis</h5>
                <p>Attention Score: ${100 - Math.round((analysis.lookAway / analysis.totalFrames) * 100)}%</p>
                <p>Behavior Confidence: ${100 - suspicionScore}%</p>
                ${suspicionScore > 50 ? '<p class="text-danger">⚠️ Unusual behavior detected</p>' : ''}
            </div>
        `;
    }

    async processRecording() {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        
        try {
            const behavioralReport = await this.videoAnalysisService.generateAnalysisReport(
                this.analysisResults.behavioral
            );

            this.showResults({
                behavioral: behavioralReport,
                recording: URL.createObjectURL(blob)
            });
        } catch (error) {
            console.error('Error processing recording:', error);
            this.showError('Failed to process recording: ' + error.message);
        }
    }

    showResults(results) {
        const resultsDiv = document.getElementById('analysisResults');
        resultsDiv.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h4>Interview Analysis Results</h4>
                </div>
                <div class="card-body">
                    <h5>Behavioral Analysis</h5>
                    <div class="alert ${results.behavioral.suspicionScore > 50 ? 'alert-warning' : 'alert-info'}">
                        <p>Suspicion Score: ${results.behavioral.suspicionScore}%</p>
                        <h6>Warning Flags:</h6>
                        <ul>
                            ${results.behavioral.flags.map(flag => `<li>${flag}</li>`).join('')}
                        </ul>
                        <h6>Recommendations:</h6>
                        <ul>
                            ${results.behavioral.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="mt-3">
                        <h5>Recording</h5>
                        <video controls src="${results.recording}" class="w-100"></video>
                    </div>
                </div>
            </div>
        `;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-3';
        errorDiv.textContent = message;
        document.getElementById('analysisResults').prepend(errorDiv);
    }

    updateUI(state) {
        const startBtn = document.getElementById('startInterview');
        const endBtn = document.getElementById('endInterview');
        
        if (state === 'recording') {
            startBtn.disabled = true;
            endBtn.disabled = false;
        } else {
            startBtn.disabled = false;
            endBtn.disabled = true;
        }
    }

    endInterview() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        const videoElement = document.getElementById('localVideo');
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }

        this.updateUI('ended');
    }
}

export default InterviewManager;