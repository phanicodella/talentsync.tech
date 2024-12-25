// src/js/services/config.js
const config = {
    OPENAI_API_KEY: window.ENV ? window.ENV.OPENAI_API_KEY : '', // Fallback to empty string
    API_BASE_URL: window.ENV ? window.ENV.API_BASE_URL : 'http://localhost:3000',

    openai: {
        model: window.ENV ? window.ENV.OPENAI_MODEL : 'gpt-4',
        maxTokens: window.ENV ? parseInt(window.ENV.OPENAI_MAX_TOKENS) : 1000,
        temperature: window.ENV ? parseFloat(window.ENV.OPENAI_TEMPERATURE) : 0.7,
        analyzeInterval: window.ENV ? parseInt(window.ENV.ANALYZE_INTERVAL) : 30000
    },

    features: {
        faceRecognition: window.ENV ? window.ENV.ENABLE_FACE_RECOGNITION === 'true' : true,
        speechAnalysis: window.ENV ? window.ENV.ENABLE_SPEECH_ANALYSIS === 'true' : true,
        nlpAnalysis: window.ENV ? window.ENV.ENABLE_NLP_ANALYSIS === 'true' : true,
        realTimeAnalysis: window.ENV ? window.ENV.ENABLE_REALTIME_ANALYSIS === 'true' : true
    },

    interview: {
        maxDuration: window.ENV ? parseInt(window.ENV.MAX_DURATION) : 3600,
        defaultTimeLimit: window.ENV ? parseInt(window.ENV.DEFAULT_TIME_LIMIT) : 1800,
        allowedFileTypes: ['video/webm', 'video/mp4'],
        maxFileSize: window.ENV ? parseInt(window.ENV.MAX_FILE_SIZE) : 100 * 1024 * 1024,
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
        type: window.ENV ? window.ENV.STORAGE_TYPE : 'localStorage',
        encryptionEnabled: window.ENV ? window.ENV.ENCRYPTION_ENABLED === 'true' : true
    },

    DEBUG_MODE: window.ENV ? window.ENV.DEBUG_MODE === 'true' : false
};

window.config = config;