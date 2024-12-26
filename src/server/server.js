// src/server/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch'); // Ensure node-fetch is installed
console.log("only for deployment");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../..')));

// Serve environment variables safely
const config = (req, res) => {
    res.json({
        API_BASE_URL: process.env.API_BASE_URL,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY, // Add this for frontend config
        features: {
            faceRecognition: process.env.ENABLE_FACE_RECOGNITION === 'true',
            speechAnalysis: process.env.ENABLE_SPEECH_ANALYSIS === 'true',
            nlpAnalysis: process.env.ENABLE_NLP_ANALYSIS === 'true',
            realTimeAnalysis: process.env.ENABLE_REALTIME_ANALYSIS === 'true'
        },
        interview: {
            maxDuration: parseInt(process.env.MAX_DURATION) || 3600,
            defaultTimeLimit: parseInt(process.env.DEFAULT_TIME_LIMIT) || 1800
        }
    });
};

// OpenAI proxy endpoint
const analyze = async (req, res) => {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Vercel serverless function exports
module.exports = app;
module.exports.config = config;
module.exports.analyze = analyze;
