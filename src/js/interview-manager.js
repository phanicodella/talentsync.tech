import VideoAnalysisService from './services/videoAnalysisService.js';
import interviewService from './services/interviewService.js';

class InterviewManager {
    constructor() {
        this.videoAnalysisService = new VideoAnalysisService();
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.analysisResults = {
            behavioral: null,
            openai: null
        };
        this.currentInterviewId = null;
        this.baseURL = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000' 
            : window.location.origin;
    }

    async initialize() {
        try {
            await this.videoAnalysisService.loadModels();
            this.setupEventListeners();
            // Get interview ID from URL if exists
            const urlParams = new URLSearchParams(window.location.search);
            this.currentInterviewId = urlParams.get('id');
            
            if (this.currentInterviewId) {
                await this.loadInterviewData();
            }
            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize interview system');
            return false;
        }
    }

    async loadInterviewData() {
        try {
            const interview = await interviewService.getInterviewById(this.currentInterviewId);
            this.updateInterviewInfo(interview);
        } catch (error) {
            console.error('Error loading interview data:', error);
            this.showError('Failed to load interview data');
        }
    }

    updateInterviewInfo(interview) {
        const infoElement = document.getElementById('interviewInfo');
        if (infoElement && interview) {
            infoElement.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${interview.candidateName}</h5>
                        <p class="card-text">
                            <strong>Type:</strong> ${interview.interviewType}<br>
                            <strong>Date:</strong> ${new Date(interview.interviewDate).toLocaleString()}<br>
                            <strong>Status:</strong> <span class="badge bg-${this.getStatusBadgeColor(interview.status)}">${interview.status}</span>
                        </p>
                    </div>
                </div>
            `;
        }
    }

    getStatusBadgeColor(status) {
        const colors = {
            scheduled: 'primary',
            ongoing: 'warning',
            completed: 'success',
            cancelled: 'danger'
        };
        return colors[status] || 'secondary';
    }

    setupEventListeners() {
        const startBtn = document.getElementById('startInterview');
        const endBtn = document.getElementById('endInterview');
        const toggleDebugBtn = document.getElementById('toggleDebug');

        if (startBtn) startBtn.addEventListener('click', () => this.startInterview());
        if (endBtn) endBtn.addEventListener('click', () => this.endInterview());
        if (toggleDebugBtn) toggleDebugBtn.addEventListener('click', () => this.toggleDebug());
    }

    async startInterview() {
        try {
            if (!this.currentInterviewId) {
                throw new Error('No interview ID found');
            }

            // Update interview status to ongoing
            await interviewService.updateInterviewStatus(this.currentInterviewId, 'ongoing');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            const videoElement = document.getElementById('videoElement');
            if (videoElement) {
                videoElement.srcObject = stream;
                await videoElement.play();
            }

            this.setupMediaRecorder(stream);
            this.startBehavioralAnalysis(videoElement);
            this.updateUI('recording');
            
            return true;
        } catch (error) {
            console.error('Error starting interview:', error);
            this.showError('Failed to start interview: ' + error.message);
            return false;
        }
    }

    setupMediaRecorder(stream) {
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9,opus'
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.start(1000); // Record in 1-second chunks
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
            }, 1000);
        } catch (error) {
            console.error('Behavioral analysis error:', error);
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

    async endInterview() {
        try {
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
                const tracks = this.mediaRecorder.stream.getTracks();
                tracks.forEach(track => track.stop());
            }

            // Update interview status
            if (this.currentInterviewId) {
                await interviewService.updateInterviewStatus(this.currentInterviewId, 'completed');
            }

            // Process recording if exists
            if (this.recordedChunks.length > 0) {
                await this.processRecording();
            }

            this.updateUI('ended');
            return true;
        } catch (error) {
            console.error('Error ending interview:', error);
            this.showError('Failed to end interview: ' + error.message);
            return false;
        }
    }

    async processRecording() {
        try {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const videoURL = URL.createObjectURL(blob);
            
            // Save recording if needed
            // await this.saveRecording(blob);

            // Generate and show analysis
            const analysis = await this.videoAnalysisService.generateAnalysisReport(this.analysisResults.behavioral);
            this.showResults({
                videoURL,
                analysis
            });
        } catch (error) {
            console.error('Error processing recording:', error);
            throw error;
        }
    }

    showResults(results) {
        const resultsDiv = document.getElementById('analysisResults');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h4>Interview Analysis Results</h4>
                </div>
                <div class="card-body">
                    <h5>Behavioral Analysis</h5>
                    <div class="alert ${results.analysis.suspicionScore > 50 ? 'alert-warning' : 'alert-info'}">
                        <p>Suspicion Score: ${results.analysis.suspicionScore}%</p>
                        <h6>Warning Flags:</h6>
                        <ul>
                            ${results.analysis.flags.map(flag => `<li>${flag}</li>`).join('')}
                        </ul>
                        <h6>Recommendations:</h6>
                        <ul>
                            ${results.analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="mt-3">
                        <h5>Recording</h5>
                        <video controls src="${results.videoURL}" class="w-100"></video>
                    </div>
                </div>
            </div>
        `;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-3';
        errorDiv.textContent = message;
        
        const resultsDiv = document.getElementById('analysisResults');
        if (resultsDiv) {
            resultsDiv.prepend(errorDiv);
        }
    }

    updateUI(state) {
        const startBtn = document.getElementById('startInterview');
        const endBtn = document.getElementById('endInterview');
        
        if (startBtn) startBtn.disabled = state === 'recording';
        if (endBtn) endBtn.disabled = state !== 'recording';
    }

    toggleDebug() {
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel) {
            debugPanel.classList.toggle('visible');
        }
    }
}

export default InterviewManager;