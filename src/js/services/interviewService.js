// src/js/services/interviewService.js
import axios from 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
import authService from './authService.js';

class InterviewService {
    constructor() {
        this.baseURL = window.config?.get('API_BASE_URL', 'http://localhost:5000');
        this.apiUrl = `${this.baseURL}/api/interviews`;
        
        this.axiosInstance = axios.create({
            baseURL: this.apiUrl,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add request interceptor for authentication
        this.axiosInstance.interceptors.request.use(
            config => {
                const token = authService.getToken();
                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
                return config;
            },
            error => Promise.reject(error)
        );
    }

    // Fetch all interviews with advanced filtering
    async getAllInterviews(params = {}) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                sortBy = 'interviewDate', 
                sortOrder = 'desc',
                status,
                type
            } = params;

            const response = await this.axiosInstance.get('/', {
                params: { 
                    page, 
                    limit, 
                    sortBy, 
                    sortOrder, 
                    status, 
                    type 
                }
            });

            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    // Create a new interview
    async createInterview(interviewData) {
        try {
            const formattedData = {
                candidateName: interviewData.name || interviewData.candidateName,
                candidateEmail: interviewData.email || interviewData.candidateEmail,
                candidatePhone: interviewData.phone || '',
                interviewDate: new Date(interviewData.date || interviewData.interviewDate).toISOString(),
                interviewType: interviewData.type || interviewData.interviewType,
                notes: interviewData.notes || '',
                status: 'scheduled'
            };

            const response = await this.axiosInstance.post('/', formattedData);
            return response.data.interview;
        } catch (error) {
            this.handleError(error);
        }
    }

    // Get interview by ID
    async getInterviewById(id) {
        try {
            const response = await this.axiosInstance.get(`/${id}`);
            return response.data.interview;
        } catch (error) {
            this.handleError(error);
        }
    }

    // Update interview status
    async updateInterviewStatus(id, status) {
        try {
            const response = await this.axiosInstance.patch(`/${id}/status`, { status });
            return response.data.interview;
        } catch (error) {
            this.handleError(error);
        }
    }

    // Delete an interview
    async deleteInterview(id) {
        try {
            const response = await this.axiosInstance.delete(`/${id}`);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    // Get interview analytics
    async getInterviewAnalytics() {
        try {
            const response = await this.axiosInstance.get('/analytics');
            return response.data.analytics;
        } catch (error) {
            this.handleError(error);
        }
    }

    // Verify interview link
    async verifyInterviewLink(id, candidateName) {
        try {
            const response = await axios.post(`${this.baseURL}/api/interviews/verify/${id}`, { 
                candidateName 
            });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    // Error handling
    handleError(error) {
        console.error('Interview Service Error:', error);
        
        if (error.response) {
            // Backend returned a specific error
            const errorMessage = error.response.data.message || 'An error occurred';
            
            // Check for authentication errors
            if (error.response.status === 401) {
                authService.logout();
                window.location.href = '/login.html';
            }

            throw new Error(errorMessage);
        } else if (error.request) {
            // No response received
            throw new Error('No response from server. Please check your connection.');
        } else {
            // General error
            throw new Error('An unexpected error occurred');
        }
    }

    // Utility methods
    formatInterviewDate(date) {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
        });
    }

    generateCSV(interviews) {
        const headers = ['Name', 'Email', 'Date', 'Type', 'Status', 'Notes'];
        const csvRows = interviews.map(interview => [
            interview.candidateName,
            interview.candidateEmail,
            this.formatInterviewDate(interview.interviewDate),
            interview.interviewType,
            interview.status,
            interview.notes || ''
        ]);
        
        return [
            headers.join(','), 
            ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');
    }
}

const interviewService = new InterviewService();
export default interviewService;
