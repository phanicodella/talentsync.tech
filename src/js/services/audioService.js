// src/js/services/audioService.js
import config from './config.js';

class AudioService {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.qualityMetrics = {
            volume: 0,
            noiseLevel: 0,
            clarity: 0
        };
        this.toneAnalysis = {
            pitch: [],
            emotion: null,
            confidence: 0
        };
    }

    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            return true;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            throw error;
        }
    }

    async startRecording(stream) {
        const audioTrack = stream.getAudioTracks()[0];
        const source = this.audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
        source.connect(this.analyser);

        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 128000
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.start(1000);
        this.startAudioAnalysis();
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.stopAudioAnalysis();
        return new Blob(this.audioChunks, { type: 'audio/webm' });
    }

    startAudioAnalysis() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        const analyze = () => {
            this.analyser.getFloatTimeDomainData(dataArray);
            
            this.qualityMetrics = {
                volume: this.calculateVolume(dataArray),
                noiseLevel: this.calculateNoiseLevel(dataArray),
                clarity: this.calculateClarity(dataArray)
            };

            this.toneAnalysis = {
                pitch: this.analyzePitch(dataArray),
                emotion: this.analyzeEmotion(dataArray),
                confidence: this.calculateConfidence(dataArray)
            };

            if (this.onAnalysis) {
                this.onAnalysis(this.qualityMetrics, this.toneAnalysis);
            }

            this.analysisFrame = requestAnimationFrame(analyze);
        };

        this.analysisFrame = requestAnimationFrame(analyze);
    }

    stopAudioAnalysis() {
        if (this.analysisFrame) {
            cancelAnimationFrame(this.analysisFrame);
        }
    }

    calculateVolume(dataArray) {
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += Math.abs(dataArray[i]);
        }
        return (sum / dataArray.length) * 100;
    }

    calculateNoiseLevel(dataArray) {
        let variance = 0;
        const mean = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        for (let i = 0; i < dataArray.length; i++) {
            variance += Math.pow(dataArray[i] - mean, 2);
        }
        
        return Math.sqrt(variance / dataArray.length) * 100;
    }

    calculateClarity(dataArray) {
        const frequencies = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(frequencies);
        
        let signalPower = 0;
        let noisePower = 0;
        
        for (let i = 0; i < frequencies.length; i++) {
            if (i < frequencies.length * 0.1 || i > frequencies.length * 0.9) {
                noisePower += Math.pow(10, frequencies[i] / 10);
            } else {
                signalPower += Math.pow(10, frequencies[i] / 10);
            }
        }
        
        return (signalPower / (noisePower + 1)) * 100;
    }

    analyzePitch(dataArray) {
        const frequencies = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(frequencies);
        
        let maxFrequency = 0;
        let maxAmplitude = -Infinity;
        
        for (let i = 0; i < frequencies.length; i++) {
            if (frequencies[i] > maxAmplitude) {
                maxAmplitude = frequencies[i];
                maxFrequency = i * (this.audioContext.sampleRate / this.analyser.fftSize);
            }
        }
        
        return maxFrequency;
    }

    analyzeEmotion(dataArray) {
        const frequencies = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(frequencies);
        
        const energyBands = {
            low: 0,
            mid: 0,
            high: 0
        };
        
        for (let i = 0; i < frequencies.length; i++) {
            const frequency = i * (this.audioContext.sampleRate / this.analyser.fftSize);
            const amplitude = Math.pow(10, frequencies[i] / 20);
            
            if (frequency < 500) energyBands.low += amplitude;
            else if (frequency < 2000) energyBands.mid += amplitude;
            else energyBands.high += amplitude;
        }
        
        if (energyBands.high > energyBands.mid && energyBands.high > energyBands.low) {
            return 'excited';
        } else if (energyBands.low > energyBands.mid && energyBands.low > energyBands.high) {
            return 'calm';
        } else {
            return 'neutral';
        }
    }

    calculateConfidence(dataArray) {
        let steadiness = 0;
        let previousValue = dataArray[0];
        
        for (let i = 1; i < dataArray.length; i++) {
            steadiness += Math.abs(dataArray[i] - previousValue);
            previousValue = dataArray[i];
        }
        
        return Math.max(0, 100 - (steadiness * 1000));
    }

    getAudioQualityStatus() {
        const status = {
            volume: this.qualityMetrics.volume > 30 && this.qualityMetrics.volume < 90,
            noise: this.qualityMetrics.noiseLevel < 30,
            clarity: this.qualityMetrics.clarity > 70
        };

        return {
            overall: Object.values(status).every(s => s),
            details: status
        };
    }
}

export default new AudioService();