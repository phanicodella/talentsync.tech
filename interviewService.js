// filepath: interviewService.js
import axios from 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';

const API_URL = `${window.config?.API_BASE_URL || 'http://localhost:5000'}/api/interviews`;

export const interviewService = {
    getAllInterviews: async () => {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching interviews:', error);
            // Fallback to localStorage if API fails
            return JSON.parse(localStorage.getItem('interviews') || '[]');
        }
    },

    createInterview: async (interviewData) => {
        try {
            const formattedData = {
                candidateName: interviewData.name,
                candidateEmail: interviewData.email,
                candidatePhone: interviewData.phone || '',
                interviewDate: new Date(interviewData.date),
                interviewType: interviewData.type,
                notes: interviewData.notes || '',
                status: 'scheduled'
            };

            const response = await axios.post(API_URL, formattedData);
            return response.data;
        } catch (error) {
            console.error('Error creating interview:', error);
            // Fallback to localStorage if API fails
            let interviews = JSON.parse(localStorage.getItem('interviews') || '[]');
            const interview = {
                ...formattedData,
                id: Date.now()
            };
            interviews.push(interview);
            localStorage.setItem('interviews', JSON.stringify(interviews));
            return interview;
        }
    },

    updateInterviewStatus: async (id, status) => {
        try {
            const response = await axios.patch(`${API_URL}/${id}/status`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating interview status:', error);
            // Fallback to localStorage if API fails
            let interviews = JSON.parse(localStorage.getItem('interviews') || '[]');
            const interviewIndex = interviews.findIndex(interview => interview.id === id);
            if (interviewIndex !== -1) {
                interviews[interviewIndex].status = status;
                localStorage.setItem('interviews', JSON.stringify(interviews));
            }
            return { id, status };
        }
    },

    deleteInterview: async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`);
            return id;
        } catch (error) {
            console.error('Error deleting interview:', error);
            // Fallback to localStorage if API fails
            let interviews = JSON.parse(localStorage.getItem('interviews') || '[]');
            interviews = interviews.filter(interview => interview.id !== id);
            localStorage.setItem('interviews', JSON.stringify(interviews));
            return id;
        }
    }
};