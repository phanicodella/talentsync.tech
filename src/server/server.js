// src/server/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../..')));

// Root route with detailed logging
app.get('/', (req, res) => {
    console.log('Accessing root route');
    const filePath = path.join(__dirname, '../..', 'index.html');
    console.log('Attempting to serve:', filePath);
    res.sendFile(filePath);
});

// Interview routes with logging
app.get('/interviews', (req, res) => {
    console.log('Accessing interviews route');
    const filePath = path.join(__dirname, '../..', 'interviews.html');
    console.log('Attempting to serve:', filePath);
    res.sendFile(filePath);
});

// Error handling middleware with detailed logging
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    console.error('Stack:', err.stack);
    res.status(500).send('Something broke! Check server logs for details.');
});

// Start server with enhanced logging
app.listen(PORT, () => {
    console.log('=================================');
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Static files served from: ${path.join(__dirname, '../..')}`);
    console.log('=================================');
});