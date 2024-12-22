// src/js/config.js

const config = {
    // In production, these values should be set through environment variables
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-api-key-here',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
    
    // Feature flags
    features: {
        faceRecognition: false,
        speechAnalysis: true,
        nlpAnalysis: true
    },

    // Interview settings
    interview: {
        maxDuration: 3600, // in seconds
        defaultTimeLimit: 1800, // in seconds
        allowedFileTypes: ['video/webm', 'video/mp4'],
        maxFileSize: 100 * 1024 * 1024 // 100MB
    },

    // Storage settings
    storage: {
        type: 'localStorage', // future options: 'indexedDB', 'server'
        encryptionEnabled: false
    }
};

// Prevent modifications to the config object
Object.freeze(config);

export default config;