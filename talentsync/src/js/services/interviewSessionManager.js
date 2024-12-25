// src/js/services/interviewSessionManager.js
class InterviewSessionManager {
    constructor() {
        this.currentSession = null;
        this.recordingTimer = null;
        this.maxDuration = window.config.interview.maxDuration;
        this.services = {
            face: window.FaceAnalysisService,
            voice: window.VoiceAnalysisService,
            openai: window.OpenAIService
        };
        this.analysisData = {
            behavioral: [],
            voice: [],
            transcript: ''
        };
    }

    async initializeSession(sessionConfig = {}) {
        try {
            await Promise.all([
                this.services.face.initialize(),
                this.services.voice.initialize()
            ]);

            this.currentSession = {
                id: `session_${Date.now()}`,
                startTime: new Date(),
                config: {
                    ...window.config.interview,
                    ...sessionConfig
                },
                status: 'initialized'
            };

            return this.currentSession;
        } catch (error) {
            console.error('Session initialization failed:', error);
            throw error;
        }
    }

    async startRecording() {
        if (!this.currentSession) {
            throw new Error('Session not initialized');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: this.currentSession.config.recordingQuality.video,
                audio: this.currentSession.config.recordingQuality.audio
            });

            // Start face analysis
            this.startFaceAnalysis(stream);

            // Start voice analysis
            await this.startVoiceAnalysis(stream);

            // Start session timer
            this.startSessionTimer();

            this.currentSession.status = 'recording';
            this.currentSession.stream = stream;

            return true;
        } catch (error) {
            console.error('Recording start failed:', error);
            throw error;
        }
    }

    startFaceAnalysis(stream) {
        const videoTrack = stream.getVideoTracks()[0];
        const videoElement = document.getElementById('videoElement');
        videoElement.srcObject = new MediaStream([videoTrack]);

        this.faceAnalysisInterval = setInterval(async () => {
            const analysis = await this.services.face.analyzeFrame(videoElement);
            if (analysis) {
                this.analysisData.behavioral.push({
                    timestamp: Date.now(),
                    ...analysis
                });
                this.updateLiveAnalysis(analysis);
            }
        }, 1000);
    }

    async startVoiceAnalysis(stream) {
        this.services.voice.setTranscriptUpdateCallback(this.handleTranscriptUpdate.bind(this));
        this.services.voice.setVolumeUpdateCallback(this.handleVolumeUpdate.bind(this));
        await this.services.voice.startRecording(stream);
    }

    handleTranscriptUpdate(data) {
        this.analysisData.transcript = data.final;
        this.analysisData.voice.push({
            timestamp: Date.now(),
            ...data.analysis
        });
        this.updateTranscriptDisplay(data);
    }

    handleVolumeUpdate(data) {
        const meter = document.getElementById('audioMeterFill');
        if (meter) {
            meter.style.width = `${data.volume}%`;
            meter.style.backgroundColor = this.getVolumeColor(data);
        }
    }

    getVolumeColor(data) {
        if (data.volume < 30) return '#dc3545'; // Too quiet
        if (data.volume > 80) return '#ffc107'; // Too loud
        return '#28a745'; // Good
    }

    updateLiveAnalysis(analysis) {
        const liveAnalysis = document.getElementById('liveAnalysis');
        if (liveAnalysis) {
            const alertLevel = this.calculateAlertLevel(analysis);
            liveAnalysis.className = `analysis-overlay ${alertLevel}`;
            liveAnalysis.innerHTML = this.generateLiveAnalysisHTML(analysis);
        }
    }

    calculateAlertLevel(analysis) {
        if (analysis.suspiciousCount > 5) return 'suspicious-alert';
        if (analysis.outOfFrameCount > 10) return 'warning-alert';
        return '';
    }

    generateLiveAnalysisHTML(analysis) {
        return `
            <div>
                <p>
                    <span class="status-indicator ${analysis.status === 'detected' ? 'status-active' : 'status-warning'}"></span>
                    Face Detection: ${analysis.status === 'detected' ? '✓ Active' : '⚠️ Check Position'}
                </p>
                <p>
                    <span class="status-indicator ${analysis.analysis?.attention > 0.7 ? 'status-active' : 'status-warning'}"></span>
                    Attention: ${Math.round((analysis.analysis?.attention || 0) * 100)}%
                </p>
                ${analysis.warnings?.length ? `
                    <div class="warnings">
                        ${analysis.warnings.map(w => `<p class="text-warning">⚠️ ${w}</p>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    updateTranscriptDisplay(data) {
        const transcriptElement = document.getElementById('openaiAnalysis');
        if (transcriptElement) {
            transcriptElement.innerHTML = `
                <div class="alert alert-info">
                    <h5>Interview Transcription</h5>
                    <p><strong>Current Transcript:</strong></p>
                    <p>${data.final}</p>
                    ${data.interim ? `<p><strong>Current:</strong> ${data.interim}</p>` : ''}
                    <div class="mt-3">
                        <small class="text-muted">Last updated: ${new Date().toLocaleTimeString()}</small>
                    </div>
                </div>
            `;
        }
    }

    startSessionTimer() {
        const timerElement = document.getElementById('timer');
        const startTime = Date.now();

        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            if (timerElement) {
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }

            if (elapsed >= this.maxDuration) {
                this.stopRecording('timeout');
            }
        }, 1000);
    }

    async stopRecording(reason = 'manual') {
        if (!this.currentSession || this.currentSession.status !== 'recording') {
            return;
        }

        clearInterval(this.recordingTimer);
        clearInterval(this.faceAnalysisInterval);

        // Stop all tracks
        this.currentSession.stream.getTracks().forEach(track => track.stop());

        // Stop voice analysis
        const voiceData = await this.services.voice.stopRecording();

        // Generate final analysis
        const finalAnalysis = await this.generateFinalAnalysis();

        this.currentSession.status = 'completed';
        this.currentSession.endTime = new Date();
        this.currentSession.endReason = reason;
        this.currentSession.analysis = finalAnalysis;

        return finalAnalysis;
    }

    async generateFinalAnalysis() {
        const transcript = this.analysisData.transcript;
        
        try {
            const [openAiAnalysis, followUpQuestions] = await Promise.all([
                this.services.openai.analyzeInterview(transcript),
                this.services.openai.generateFollowUpQuestions(transcript)
            ]);

            const behavioralSummary = this.summarizeBehavioralData();
            const voiceSummary = this.summarizeVoiceData();

            return {
                transcript,
                openAiAnalysis,
                followUpQuestions,
                behavioral: behavioralSummary,
                voice: voiceSummary,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Analysis generation failed:', error);
            throw error;
        }
    }

    summarizeBehavioralData() {
        const totalFrames = this.analysisData.behavioral.length;
        if (totalFrames === 0) return null;

        const summary = {
            attentionScore: 0,
            suspiciousCount: 0,
            outOfFrameCount: 0,
            warnings: []
        };

        this.analysisData.behavioral.forEach(frame => {
            if (frame.analysis?.attention) {
                summary.attentionScore += frame.analysis.attention;
            }
            if (frame.suspiciousCount) summary.suspiciousCount += frame.suspiciousCount;
            if (frame.outOfFrameCount) summary.outOfFrameCount += frame.outOfFrameCount;
            if (frame.analysis?.warnings) {
                summary.warnings.push(...frame.analysis.warnings);
            }
        });

        summary.attentionScore = summary.attentionScore / totalFrames;
        summary.warnings = [...new Set(summary.warnings)]; // Remove duplicates

        return summary;
    }

    summarizeVoiceData() {
        const voiceData = this.analysisData.voice;
        if (voiceData.length === 0) return null;

        return {
            averageVolume: voiceData.reduce((sum, data) => sum + data.volume, 0) / voiceData.length,
            clarityScore: voiceData.reduce((sum, data) => sum + data.clarity, 0) / voiceData.length,
            confidenceScore: voiceData.reduce((sum, data) => sum + data.confidence, 0) / voiceData.length,
            wordsPerMinute: this.services.voice.calculateSpeakingPace()
        };
    }

    getSessionData() {
        return this.currentSession;
    }

    reset() {
        if (this.currentSession?.stream) {
            this.currentSession.stream.getTracks().forEach(track => track.stop());
        }
        
        clearInterval(this.recordingTimer);
        clearInterval(this.faceAnalysisInterval);
        
        this.currentSession = null;
        this.analysisData = {
            behavioral: [],
            voice: [],
            transcript: ''
        };
        
        this.services.voice.reset();
        this.services.face.reset();
    }
}

window.InterviewSessionManager = new InterviewSessionManager();