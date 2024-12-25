// src/js/services/voiceAnalysisService.js
class VoiceAnalysisService {
    constructor() {
        this.audioContext = null;
        this.analyzer = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.transcript = '';
        this.onTranscriptUpdate = null;
    }

    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyzer = this.audioContext.createAnalyser();
            this.analyzer.fftSize = 2048;

            if (!('webkitSpeechRecognition' in window)) {
                throw new Error('Speech recognition not supported in this browser');
            }

            this.recognition = new webkitSpeechRecognition();
            this.setupSpeechRecognition();
            return true;
        } catch (error) {
            console.error('Voice analysis initialization error:', error);
            throw error;
        }
    }

    setupSpeechRecognition() {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                    this.transcript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (this.onTranscriptUpdate) {
                this.onTranscriptUpdate({
                    final: this.transcript,
                    interim: interimTranscript,
                    analysis: this.analyzeVoiceMetrics()
                });
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        this.recognition.onend = () => {
            if (this.isRecording) {
                this.recognition.start();
            }
        };
    }

    async startRecording(stream) {
        if (!this.audioContext) {
            await this.initialize();
        }

        const audioTrack = stream.getAudioTracks()[0];
        const source = this.audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
        source.connect(this.analyzer);

        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 128000
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.start(1000);
        this.recognition.start();
        this.isRecording = true;

        this.startVolumeMonitoring();
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.recognition.stop();
        this.isRecording = false;

        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedChunks = [];
        return {
            audio: audioBlob,
            transcript: this.transcript,
            analysis: this.analyzeVoiceMetrics()
        };
    }

    startVolumeMonitoring() {
        const bufferLength = this.analyzer.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        const updateVolume = () => {
            if (!this.isRecording) return;

            this.analyzer.getFloatTimeDomainData(dataArray);
            const volume = this.calculateVolume(dataArray);
            const noiseLevel = this.calculateNoiseLevel(dataArray);
            const clarity = this.calculateClarity(dataArray);

            if (this.onVolumeUpdate) {
                this.onVolumeUpdate({
                    volume,
                    noiseLevel,
                    clarity
                });
            }

            requestAnimationFrame(updateVolume);
        };

        updateVolume();
    }

    calculateVolume(dataArray) {
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += Math.abs(dataArray[i]);
        }
        return (sum / dataArray.length) * 100;
    }

    calculateNoiseLevel(dataArray) {
        let sum = 0;
        let sumSquares = 0;

        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
            sumSquares += dataArray[i] * dataArray[i];
        }

        const mean = sum / dataArray.length;
        const variance = (sumSquares / dataArray.length) - (mean * mean);
        return Math.sqrt(variance) * 100;
    }

    calculateClarity(dataArray) {
        const frequencies = new Float32Array(this.analyzer.frequencyBinCount);
        this.analyzer.getFloatFrequencyData(frequencies);
        
        let signalPower = 0;
        let noisePower = 0;
        
        frequencies.forEach((frequency, i) => {
            const power = Math.pow(10, frequency / 10);
            if (i < frequencies.length * 0.1 || i > frequencies.length * 0.9) {
                noisePower += power;
            } else {
                signalPower += power;
            }
        });
        
        return (signalPower / (noisePower + 1)) * 100;
    }

    analyzeVoiceMetrics() {
        return {
            duration: this.getDuration(),
            speakingPace: this.calculateSpeakingPace(),
            clarity: this.getAverageClarity(),
            confidence: this.calculateConfidence()
        };
    }

    getDuration() {
        return this.mediaRecorder ? this.mediaRecorder.time : 0;
    }

    calculateSpeakingPace() {
        const words = this.transcript.trim().split(/\s+/).length;
        const minutes = this.getDuration() / 60000;
        return words / Math.max(minutes, 1);
    }

    // src/js/services/voiceAnalysisService.js (continued from previous code)
    getAverageClarity() {
        const bufferLength = this.analyzer.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        this.analyzer.getFloatTimeDomainData(dataArray);
        return this.calculateClarity(dataArray);
    }

    calculateConfidence() {
        if (!this.transcript) return 0;

        // Calculate confidence based on multiple factors
        const metrics = {
            volumeScore: this.getVolumeScore(),
            paceScore: this.getPaceScore(),
            clarityScore: this.getAverageClarity() / 100,
            fillerWordsScore: this.getFillerWordsScore(),
            pausePatternScore: this.getPausePatternScore()
        };

        // Weighted average of all metrics
        const weights = {
            volumeScore: 0.2,
            paceScore: 0.2,
            clarityScore: 0.3,
            fillerWordsScore: 0.15,
            pausePatternScore: 0.15
        };

        return Object.entries(metrics).reduce((total, [key, value]) => {
            return total + (value * weights[key]);
        }, 0);
    }

    getVolumeScore() {
        const bufferLength = this.analyzer.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        this.analyzer.getFloatTimeDomainData(dataArray);
        const volume = this.calculateVolume(dataArray);
        
        // Normalize volume score (optimal range: 40-80)
        if (volume < 20) return volume / 20;
        if (volume > 90) return 1 - ((volume - 90) / 10);
        if (volume >= 40 && volume <= 80) return 1;
        return 0.7;
    }

    getPaceScore() {
        const wordsPerMinute = this.calculateSpeakingPace();
        // Optimal speaking pace: 120-160 words per minute
        if (wordsPerMinute < 80) return 0.5;
        if (wordsPerMinute > 200) return 0.6;
        if (wordsPerMinute >= 120 && wordsPerMinute <= 160) return 1;
        return 0.8;
    }

    getFillerWordsScore() {
        const fillerWords = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of'];
        const words = this.transcript.toLowerCase().split(/\s+/);
        const fillerCount = words.filter(word => fillerWords.includes(word)).length;
        const fillerRatio = fillerCount / words.length;
        return Math.max(0, 1 - (fillerRatio * 10));
    }

    getPausePatternScore() {
        const text = this.transcript;
        const sentences = text.split(/[.!?]+/).filter(Boolean);
        if (sentences.length < 2) return 0.5;

        // Analyze pause patterns using punctuation and sentence length
        let score = 0;
        let previousLength = 0;

        for (const sentence of sentences) {
            const words = sentence.trim().split(/\s+/).length;
            
            // Good variation in sentence length
            if (previousLength > 0) {
                const variation = Math.abs(words - previousLength) / Math.max(words, previousLength);
                score += variation <= 0.5 ? 0.5 : 0.3;
            }

            // Natural sentence length (5-15 words is optimal)
            score += (words >= 5 && words <= 15) ? 0.5 : 0.3;

            previousLength = words;
        }

        return score / sentences.length;
    }

    setTranscriptUpdateCallback(callback) {
        this.onTranscriptUpdate = callback;
    }

    setVolumeUpdateCallback(callback) {
        this.onVolumeUpdate = callback;
    }

    reset() {
        this.transcript = '';
        this.recordedChunks = [];
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
        }
        if (this.recognition) {
            this.recognition.stop();
        }
        this.isRecording = false;
    }

    async getAudioBlob() {
        if (this.recordedChunks.length === 0) {
            return null;
        }
        return new Blob(this.recordedChunks, { type: 'audio/webm' });
    }

    async exportTranscript() {
        if (!this.transcript) {
            throw new Error('No transcript available');
        }

        const analysis = this.analyzeVoiceMetrics();
        const exportData = {
            transcript: this.transcript,
            metrics: {
                duration: analysis.duration,
                wordsPerMinute: analysis.speakingPace,
                clarity: analysis.clarity,
                confidence: analysis.confidence
            },
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        return blob;
    }
}

window.VoiceAnalysisService = new VoiceAnalysisService();