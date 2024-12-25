// src/js/services/openaiService.js
class OpenAIService {
    constructor() {
        this.baseURL = `${window.config.API_BASE_URL}/api`;
    }

    async analyzeInterview(transcript) {
        try {
            const response = await fetch(`${this.baseURL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: window.config.openai.model,
                    messages: [{
                        role: 'system',
                        content: `You are an AI interview analyzer. Analyze the interview transcript and provide a structured response with these exact keys:
                        {
                            "key_traits": {
                                "confidence": <number 0-1>,
                                "clarity": <number 0-1>,
                                "technical_knowledge": <number 0-1>,
                                "communication": <number 0-1>,
                                "leadership": <number 0-1>
                            },
                            "behavioral_flags": [<string>],
                            "risk_factors": [<string>],
                            "recommendations": [<string>]
                        }`
                    }, {
                        role: 'user',
                        content: transcript
                    }],
                    temperature: window.config.openai.temperature,
                    max_tokens: window.config.openai.maxTokens
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Analysis error:', error);
            return {
                key_traits: {
                    confidence: 0.5,
                    clarity: 0.5,
                    technical_knowledge: 0.5,
                    communication: 0.5,
                    leadership: 0.5
                },
                behavioral_flags: ['Analysis failed'],
                risk_factors: ['Unable to complete analysis'],
                recommendations: ['Retry interview or use manual evaluation']
            };
        }
    }

    async generateFollowUpQuestions(transcript) {
        try {
            const response = await fetch(`${this.baseURL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: window.config.openai.model,
                    messages: [{
                        role: 'system',
                        content: 'Generate 3 follow-up interview questions based on this context. Return a JSON array of exactly 3 questions.'
                    }, {
                        role: 'user',
                        content: transcript
                    }],
                    temperature: 0.7,
                    max_tokens: 250
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Questions generation error:', error);
            return [
                'Could you elaborate on your previous experience?',
                'What challenges are you looking for in this role?',
                'Do you have any questions about the position?'
            ];
        }
    }
}

window.OpenAIService = new OpenAIService();