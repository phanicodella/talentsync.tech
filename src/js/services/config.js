// src/js/services/config.js
const config = {
    OPENAI_API_KEY: window.env.OPENAI_API_KEY,
    API_BASE_URL: 'http://localhost:3000',
    
    openai: {
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7,
        analyzeInterval: 30000 // 30 seconds between analyses
    },

    features: {
        faceRecognition: true,
        speechAnalysis: true,
        nlpAnalysis: true,
        realTimeAnalysis: true
    },

    interview: {
        maxDuration: 3600, // 1 hour
        defaultTimeLimit: 1800, // 30 minutes
        allowedFileTypes: ['video/webm', 'video/mp4'],
        maxFileSize: 100 * 1024 * 1024, // 100MB
        recordingQuality: {
            audio: {
                sampleRate: 48000,
                channelCount: 2,
                echoCancellation: true,
                noiseSuppression: true
            },
            video: {
                width: 1280,
                height: 720,
                frameRate: 30
            }
        }
    },

    storage: {
        type: 'localStorage',
        encryptionEnabled: true
    },
    
    DEBUG_MODE: false
};

window.config = config;