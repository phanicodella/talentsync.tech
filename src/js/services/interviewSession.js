// frontend/src/js/services/interviewSession.js

import authService from './authService.js';
import openaiService from './openaiService.js';

export class InterviewSession {
    constructor(interviewId) {
        this.interviewId = interviewId;
        this.state = {
            status: 'initializing',
            isInterviewer: false,
            mediaStream: null,
            audioContext: null,
            audioAnalyser: null,
            mediaRecorder: null,
            recordedChunks: [],
            transcript: '',
            analysis: null,
            startTime: null,
            participants: new Map(),
            deviceStatus: {
                camera: false,
                microphone: false
            }
        };

        this.eventListeners = new Map();
        this.recordingInterval = null;
        this.analysisInterval = null;

        // Bind methods to maintain context
        this.handleStreamError = this.handleStreamError.bind(this);
        this.handleDataAvailable = this.handleDataAvailable.bind(this);
        this.handleRecordingStop = this.handleRecordingStop.bind(this);
    }

    // Event handling
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }

    // Initialize session
    async initialize() {
        try {
            // Check if user is interviewer or candidate
            this.state.isInterviewer = authService.isAuthenticated() && (
                authService.hasRole('interviewer') || authService.hasRole('admin')
            );

            if (!this.state.isInterviewer && !sessionStorage.getItem('interviewToken')) {
                throw new Error('Unauthorized access');
            }

            // Load interview details
            await this.loadInterviewDetails();

            // Initialize services
            await this.initializeServices();

            this.state.status = 'ready';
            this.emit('stateChange', this.state.status);
            return true;
        } catch (error) {
            console.error('Session initialization failed:', error);
            this.handleError(error);
            return false;
        }
    }

    async loadInterviewDetails() {
        const response = await fetch(`/api/interviews/${this.interviewId}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to load interview details');