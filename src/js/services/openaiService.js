// src/js/services/openaiService.js
import configService from './configService.js';
import authService from './authService.js';

class OpenAIService {
    constructor() {
        this.baseURL = configService.get('API_BASE_URL', 'http://localhost:5000');
        this.apiEndpoint = `${this.baseURL}/api/openai`;
        this.questionCache = new Map();
    }

    // Analyze interview transcript
    async analyzeInterview(transcript, options = {}) {
        try {
            const response = await fetch(`${this.apiEndpoint}/analyze`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    transcript, 
                    ...options 
                })
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Interview analysis error:', error);
            return this.generateFallbackAnalysis(transcript);
        }
    }

    // Generate follow-up questions
    async generateFollowUpQuestions(transcript, type = 'technical', count = 3) {
        try {
            const response = await fetch(`${this.apiEndpoint}/follow-up`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    transcript, 
                    type, 
                    count 
                })
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Follow-up questions error:', error);
            return this.generateFallbackQuestions(type, count);
        }
    }

    // Analyze individual response
    async analyzeResponse(question, response, type = 'technical') {
        try {
            const apiResponse = await fetch(`${this.apiEndpoint}/response-analysis`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    question, 
                    response, 
                    type 
                })
            });

            return await this.handleResponse(apiResponse);
        } catch (error) {
            console.error('Response analysis error:', error);
            return this.generateFallbackResponseAnalysis(question, response);
        }
    }

    // Get headers for API requests
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = authService.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Handle API response
    async handleResponse(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'OpenAI service request failed');
        }

        return response.json();
    }

    // Fallback methods for when API fails

    generateFallbackAnalysis(transcript) {
        const words = transcript.split(/\s+/).length;
        const sentences = transcript.split(/[.!?]+/).length;

        return {
            key_traits: {
                confidence: this.calculateConfidence(transcript),
                clarity: this.calculateClarity(transcript),
                technical_knowledge: this.detectTechnicalContent(transcript),
                communication: sentences > 0 ? 0.7 : 0.4,
                leadership: this.detectLeadershipTraits(transcript)
            },
            behavioral_flags: [
                'No detailed analysis available',
                'Recommend manual review'
            ],
            risk_factors: [
                'Limited data for comprehensive analysis'
            ],
            recommendations: [
                'Conduct a manual interview review',
                'Consider additional assessment methods'
            ]
        };
    }

    // Continued OpenAI Service

    generateFallbackQuestions(type, count) {
        const questionTypes = {
            technical: [
                `'Can you describe a challenging technical problem you've solved?',
                'What programming languages are you most comfortable with?',
                'How do you approach learning new technologies?'`
            ],
            hr: [
                'Tell me about a time you worked effectively in a team.',
                'How do you handle workplace conflicts?',
                'What motivates you in your professional career?'
            ],
            behavioral: [
                'Describe a situation where you demonstrated leadership.',
                'How do you handle high-pressure situations?',
                'Give an example of a goal you achieved through persistent effort.'
            ]
        };

        const questions = questionTypes[type] || questionTypes.behavioral;
        return questions.slice(0, count).map(question => ({
            question,
            intent: 'Assess candidate skills and experience',
            follow_ups: [],
            key_points: ['Look for specific examples', 'Evaluate communication clarity']
        }));
    }

    generateFallbackResponseAnalysis(question, response) {
        return {
            score: this.calculateResponseScore(response),
            strengths: this.identifyStrengths(response),
            weaknesses: this.identifyWeaknesses(response),
            communication_quality: this.assessCommunicationQuality(response),
            key_observations: [
                'Preliminary assessment based on limited analysis'
            ]
        };
    }

    // Utility analysis methods for fallback scenarios
    calculateConfidence(transcript) {
        const words = transcript.toLowerCase().split(/\s+/);
        const confidenceWords = ['confident', 'sure', 'certainly', 'definitely'];
        const hesitationWords = ['maybe', 'perhaps', 'um', 'uh', 'like'];
        
        const confidenceCount = words.filter(word => confidenceWords.includes(word)).length;
        const hesitationCount = words.filter(word => hesitationWords.includes(word)).length;
        
        return Math.max(0.1, Math.min(1, (confidenceCount - hesitationCount) / words.length + 0.5));
    }

    calculateClarity(transcript) {
        const sentences = transcript.split(/[.!?]+/).filter(Boolean);
        const avgWordsPerSentence = transcript.split(/\s+/).length / sentences.length;
        return Math.max(0.1, Math.min(1, (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) ? 0.8 : 0.4));
    }

    detectTechnicalContent(transcript) {
        const technicalWords = ['code', 'programming', 'software', 'development', 'technical', 'algorithm'];
        const words = transcript.toLowerCase().split(/\s+/);
        const technicalCount = words.filter(word => technicalWords.includes(word)).length;
        return Math.min(1, technicalCount / 10);
    }

    detectLeadershipTraits(transcript) {
        const leadershipWords = ['lead', 'team', 'managed', 'organized', 'coordinated'];
        const words = transcript.toLowerCase().split(/\s+/);
        const leadershipCount = words.filter(word => 
            leadershipWords.some(lWord => word.includes(lWord))
        ).length;
        return Math.min(1, leadershipCount / 5);
    }

    calculateResponseScore(response) {
        const words = response.split(/\s+/);
        const wordCount = words.length;
        
        // Score based on response length and complexity
        if (wordCount < 20) return 0.3;  // Very short response
        if (wordCount < 50) return 0.5;  // Short response
        if (wordCount < 100) return 0.7; // Moderate response
        return 0.9;  // Comprehensive response
    }

    identifyStrengths(response) {
        const strengths = [];
        
        // Check for specific examples
        if (response.match(/\b(example|instance|situation)\b/i)) {
            strengths.push('Provides concrete examples');
        }

        // Check for structured thinking
        if (response.match(/\b(first|second|then|finally)\b/i)) {
            strengths.push('Demonstrates structured communication');
        }

        // Check for technical language
        if (response.match(/\b(algorithm|framework|methodology)\b/i)) {
            strengths.push('Uses professional technical language');
        }

        return strengths;
    }

    identifyWeaknesses(response) {
        const weaknesses = [];
        
        // Check for filler words
        const fillerWords = ['um', 'like', 'you know', 'sort of'];
        const fillerCount = fillerWords.reduce((count, word) => 
            count + (response.toLowerCase().split(word).length - 1), 0
        );
        if (fillerCount > 2) {
            weaknesses.push('Excessive use of filler words');
        }

        // Check for vague language
        if (response.match(/\b(kind of|sort of|maybe|possibly)\b/i)) {
            weaknesses.push('Uses vague or noncommittal language');
        }

        // Check for incomplete thoughts
        if (response.length < 50) {
            weaknesses.push('Provides insufficient detail');
        }

        return weaknesses;
    }

    assessCommunicationQuality(response) {
        const metrics = {
            clarity: this.calculateClarity(response),
            conciseness: this.calculateResponseScore(response),
            specificity: this.identifyStrengths(response).length > 0 ? 0.8 : 0.4,
            professionalism: this.identifyWeaknesses(response).length === 0 ? 0.9 : 0.5
        };

        return {
            overall_score: Object.values(metrics).reduce((a, b) => a + b, 0) / Object.keys(metrics).length,
            details: metrics
        };
    }

    // Validate API key (admin functionality)
    async validateOpenAIKey(apiKey) {
        try {
            const response = await fetch(`${this.apiEndpoint}/validate-key`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ apiKey })
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('API Key validation error:', error);
            throw error;
        }
    }

    // Track usage of OpenAI features
    trackUsage(feature, metadata = {}) {
        try {
            // Send usage data to backend for tracking
            fetch(`${this.apiEndpoint}/usage`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    feature,
                    timestamp: new Date().toISOString(),
                    ...metadata
                })
            }).catch(console.error);
        } catch (error) {
            console.error('Usage tracking error:', error);
        }
    }

    // Reset or clear cached data
    clearCache() {
        this.questionCache.clear();
    }
}

// Create and export singleton instance
const openaiService = new OpenAIService();
export default openaiService;