// src/js/services/openaiService.js
class OpenAIService {
    constructor(apiKey) {
        if (!window.config) {
            console.error('Config not loaded');
            return;
        }
        this.apiKey = apiKey || window.config.OPENAI_API_KEY;
        this.baseURL = `${window.config.API_BASE_URL}/api`;
        this.currentQuestionIndex = 0;
        this.transcriptHistory = [];
        this.lastResponseTime = 0;
        this.minResponseInterval = 3000;
        
        this.questions = [
            {
                category: "Introduction",
                question: "Please introduce yourself and tell us about your background."
            },
            {
                category: "Experience",
                question: "What relevant experience do you have for this position?"
            },
            {
                category: "Technical Skills",
                question: "Could you describe your technical skills and how they align with this role?"
            },
            {
                category: "Problem Solving",
                question: "Tell me about a challenging problem you solved in your previous work."
            },
            {
                category: "Team Work",
                question: "How do you approach working in a team environment?"
            },
            {
                category: "Leadership",
                question: "Have you ever led a project or team? Please describe your experience."
            },
            {
                category: "Goals",
                question: "What are your career goals and how does this position fit into them?"
            },
            {
                category: "Closing",
                question: "Do you have any questions for us?"
            }
        ];
    }

    getCurrentQuestion() {
        if (this.currentQuestionIndex < this.questions.length) {
            return {
                ...this.questions[this.currentQuestionIndex],
                index: this.currentQuestionIndex + 1,
                total: this.questions.length
            };
        }
        return this.questions[this.questions.length - 1];
    }

    canMoveToNextQuestion(response) {
        const now = Date.now();
        const timeElapsed = now - this.lastResponseTime;
        
        // Check if enough time has passed and response is substantial
        const isValidResponse = response && response.trim().length >= 10;
        const hasEnoughTimeElapsed = timeElapsed > this.minResponseInterval;
        
        return isValidResponse && hasEnoughTimeElapsed;
    }

    nextQuestion(currentResponse) {
        if (!this.canMoveToNextQuestion(currentResponse)) {
            return this.getCurrentQuestion();
        }

        if (currentResponse && currentResponse.trim()) {
            this.addToTranscriptHistory(currentResponse);
        }

        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.lastResponseTime = Date.now();
        }
        
        return this.getCurrentQuestion();
    }

    resetQuestions() {
        this.currentQuestionIndex = 0;
        this.transcriptHistory = [];
        this.lastResponseTime = 0;
    }

    addToTranscriptHistory(response) {
        const currentQuestion = this.getCurrentQuestion();
        if (!this.transcriptHistory.some(item => 
            item.question === currentQuestion.question && 
            item.response === response.trim()
        )) {
            this.transcriptHistory.push({
                question: currentQuestion.question,
                response: response.trim(),
                category: currentQuestion.category,
                timestamp: new Date().toISOString()
            });
        }
    }

    getFormattedTranscript() {
        return this.transcriptHistory
            .map(item => `Q: ${item.question}\nA: ${item.response}`)
            .join('\n\n');
    }

    async analyzeInterview(transcript) {
        try {
            console.log('Analyzing transcript:', transcript);
            if (!transcript || transcript.trim().length === 0) {
                throw new Error('No transcript provided for analysis');
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{
                        role: 'system',
                        content: `You are an expert interview assessor. Analyze this interview transcript for a job interview. 
                        Evaluate the candidate's responses and provide structured insights about their performance.
                        Parse the responses carefully and assess:
                        - Level of engagement and interest
                        - Quality and depth of answers
                        - Communication style and clarity
                        - Professional attitude
                        - Technical competency signals
                        
                        Return your analysis in this exact JSON format:
                        {
                            "key_traits": {
                                "confidence": <number between 0 and 1>,
                                "clarity": <number between 0 and 1>,
                                "technical_knowledge": <number between 0 and 1>,
                                "communication": <number between 0 and 1>,
                                "leadership": <number between 0 and 1>
                            },
                            "behavioral_flags": [
                                <list of observed behaviors>,
                                <minimum 3 specific observations>
                            ],
                            "risk_factors": [
                                <list of concerns>,
                                <minimum 2 specific risks>
                            ],
                            "recommendations": [
                                <list of actionable recommendations>,
                                <minimum 3 specific recommendations>
                            ]
                        }
                        
                        Score traits based on evidence in responses. Be specific in your observations.`
                    }, {
                        role: 'user',
                        content: transcript
                    }],
                    temperature: 0.4,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                console.error('API Response not OK:', response.status);
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Raw OpenAI Response:', data);

            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Invalid API response structure');
            }

            let analysis;
            try {
                analysis = JSON.parse(data.choices[0].message.content);
                
                if (!this.validateAnalysisStructure(analysis)) {
                    throw new Error('Invalid analysis structure');
                }
            } catch (parseError) {
                console.error('Parse error:', parseError);
                throw new Error('Failed to parse analysis response');
            }

            if (this.detectDisinterest(transcript)) {
                analysis.behavioral_flags.unshift('Shows significant disinterest');
                analysis.risk_factors.unshift('Candidate appears uncommitted to the process');
                analysis.key_traits.confidence = Math.min(analysis.key_traits.confidence, 0.3);
            }

            if (this.detectNegativeAttitude(transcript)) {
                analysis.behavioral_flags.unshift('Displays negative attitude');
                analysis.risk_factors.unshift('Potential cultural fit concerns');
                analysis.key_traits.communication = Math.min(analysis.key_traits.communication, 0.3);
            }

            return analysis;

        } catch (error) {
            console.error('Analysis error:', error);
            return this.generateResponseBasedAnalysis(transcript);
        }
    }

    validateAnalysisStructure(analysis) {
        return (
            analysis &&
            analysis.key_traits &&
            typeof analysis.key_traits.confidence === 'number' &&
            typeof analysis.key_traits.clarity === 'number' &&
            typeof analysis.key_traits.technical_knowledge === 'number' &&
            typeof analysis.key_traits.communication === 'number' &&
            typeof analysis.key_traits.leadership === 'number' &&
            Array.isArray(analysis.behavioral_flags) &&
            Array.isArray(analysis.risk_factors) &&
            Array.isArray(analysis.recommendations)
        );
    }

    detectDisinterest(transcript) {
        const disinterestPatterns = [
            /don't (want|care|like)/i,
            /not interested/i,
            /this is ridiculous/i,
            /no[t]? (going|doing)/i
        ];
        return disinterestPatterns.some(pattern => pattern.test(transcript));
    }

    detectNegativeAttitude(transcript) {
        const negativePatterns = [
            /ridiculous/i,
            /stupid/i,
            /waste/i,
            /don't want to/i,
            /no[t]? (going|doing)/i
        ];
        return negativePatterns.some(pattern => pattern.test(transcript));
    }

    generateResponseBasedAnalysis(transcript) {
        const responseLines = transcript.split('\n');
        const hasResponses = responseLines.length > 0;
        
        const shortResponses = responseLines.filter(line => 
            line.includes('A:') && line.split('A:')[1].trim().split(' ').length < 5
        ).length;
        
        const negativeResponses = responseLines.filter(line =>
            line.includes('A:') && (
                line.toLowerCase().includes('no') ||
                line.toLowerCase().includes('don\'t') ||
                line.toLowerCase().includes('not')
            )
        ).length;

        const responseRatio = hasResponses ? negativeResponses / responseLines.length : 0;
        const engagementScore = Math.max(0.1, 1 - (shortResponses / responseLines.length));
        
        return {
            key_traits: {
                confidence: Math.max(0.1, 0.5 - (responseRatio * 0.3)),
                clarity: Math.max(0.1, engagementScore),
                technical_knowledge: this.detectTechnicalContent(transcript) ? 0.6 : 0.3,
                communication: Math.max(0.1, engagementScore - (responseRatio * 0.4)),
                leadership: Math.max(0.1, 0.4 - (responseRatio * 0.2))
            },
            behavioral_flags: [
                negativeResponses > 2 ? 'Shows resistance to questions' : 'Limited engagement',
                shortResponses > 2 ? 'Provides minimal responses' : 'Responses lack detail',
                'Interview engagement below expectations'
            ],
            risk_factors: [
                responseRatio > 0.3 ? 'High proportion of negative responses' : 'Limited response quality',
                'Candidate may not be fully interested in the position'
            ],
            recommendations: [
                'Consider conducting a follow-up interview with different format',
                'Probe for specific examples of past experience',
                'Assess candidate motivation and interest level'
            ]
        };
    }

    detectTechnicalContent(transcript) {
        const technicalWords = [
            'code', 'programming', 'software', 'development', 'technical',
            'engineer', 'system', 'database', 'algorithm', 'analysis'
        ];
        const technicalPattern = new RegExp(technicalWords.join('|'), 'i');
        return technicalPattern.test(transcript);
    }

    async generateFollowUpQuestions(transcript) {
        try {
            if (!transcript || transcript.trim().length === 0) {
                throw new Error('No transcript provided for follow-up questions');
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{
                        role: 'system',
                        content: `Based on this interview transcript, generate exactly 3 thoughtful follow-up questions.
                        Consider:
                        - Areas that need clarification
                        - Topics that could benefit from more detail
                        - Potential concerns that should be addressed
                        
                        Format: Return exactly 3 questions, one per line, starting with a dash (-).`
                    }, {
                        role: 'user',
                        content: transcript
                    }],
                    temperature: 0.7,
                    max_tokens: 250
                })
            });

            const data = await response.json();
            console.log('Follow-up questions raw response:', data);

            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Invalid questions response');
            }

            const questions = data.choices[0].message.content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('-'))
                .map(line => line.substring(1).trim())
                .filter(q => q.length > 0);

            return questions.length >= 3 ? questions.slice(0, 3) : this.generateContextBasedQuestions(transcript);

        } catch (error) {
            console.error('Follow-up questions error:', error);
            return this.generateContextBasedQuestions(transcript);
        }
    }

    generateContextBasedQuestions(transcript) {
        const lowEngagement = this.detectDisinterest(transcript);
        const negativeAttitude = this.detectNegativeAttitude(transcript);

        if (lowEngagement) {
            return [
                'What aspects of this role would you find most interesting or challenging?',
                'Could you help us understand what type of position you are looking for?',
                'What would make this opportunity more appealing to you?'
            ];
        }

        if (negativeAttitude) {
            return [
                'What concerns do you have about this position that we could address?',
                'How could we make this interview process more comfortable for you?',
                'What would you like to know more about regarding this opportunity?'
            ];
        }

        return [
            'Could you share more specific examples from your experience?',
            'How do you see yourself contributing to our team?',
            'What questions do you have about our company and culture?'
        ];
    }
}

// Initialize and make globally available
window.OpenAIService = new OpenAIService();