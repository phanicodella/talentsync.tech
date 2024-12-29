// src/js/services/websocketClient.js
import authService from './authService.js';

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;
        this.eventListeners = new Map();
    }

    async connect(interviewId) {
        try {
            // Get WebSocket token
            const response = await this.getWebSocketToken(interviewId);
            
            if (!response.wsToken) {
                throw new Error('Failed to get WebSocket token');
            }

            this.socket = new WebSocket(response.wsUrl);

            this.socket.onopen = () => {
                console.log('WebSocket connection established');
                this.connectionAttempts = 0;
                this.triggerEvent('connected');
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('WebSocket message parsing error:', error);
                }
            };

            this.socket.onclose = (event) => {
                console.warn('WebSocket connection closed:', event);
                this.attemptReconnect(interviewId);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.triggerEvent('error', error);
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.triggerEvent('connectionError', error);
        }
    }

    async getWebSocketToken(interviewId) {
        try {
            const baseURL = window.config?.get('API_BASE_URL', 'http://localhost:5000');
            const response = await fetch(`${baseURL}/api/ws/test-token?interviewId=${interviewId}`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get WebSocket token');
            }

            return await response.json();
        } catch (error) {
            console.error('WebSocket token retrieval error:', error);
            throw error;
        }
    }

    attemptReconnect(interviewId) {
        if (this.connectionAttempts < this.maxConnectionAttempts) {
            this.connectionAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
            
            setTimeout(() => {
                console.log(`Attempting WebSocket reconnection (${this.connectionAttempts})`);
                this.connect(interviewId);
            }, delay);
        } else {
            console.error('Max WebSocket connection attempts reached');
            this.triggerEvent('maxAttemptsReached');
        }
    }

    sendMessage(type, data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, data }));
        } else {
            console.warn('WebSocket not connected');
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'chat':
                this.triggerEvent('chat', message.data);
                break;
            case 'transcript_updated':
                this.triggerEvent('transcriptUpdate', message.data);
                break;
            case 'analysis_updated':
                this.triggerEvent('analysisUpdate', message.data);
                break;
            case 'participant_joined':
                this.triggerEvent('participantJoined', message.data);
                break;
            case 'participant_left':
                this.triggerEvent('participantLeft', message.data);
                break;
            case 'interview_control':
                this.triggerEvent('interviewControl', message.data);
                break;
            default:
                console.warn('Unknown WebSocket message type:', message.type);
        }
    }

    // Event management
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    triggerEvent(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    // Cleanup
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.eventListeners.clear();
    }
}

export default new WebSocketClient();
