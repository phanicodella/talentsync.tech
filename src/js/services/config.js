(function() {
    // Determine base URL based on environment
    const determineBaseURL = () => {
        const hostname = window.location.hostname;
        switch (hostname) {
            case 'localhost':
                return 'http://localhost:5000';
            case 'talentsync.vercel.app':
                return 'https://talentsync-backend.herokuapp.com';
            default:
                return window.location.origin;
        }
    };

    // Default configuration with comprehensive fallbacks
    const defaultConfig = {
        API_BASE_URL: determineBaseURL(),
        API_ENDPOINTS: {
            interviews: '/api/interviews',
            openai: '/api/openai',
            config: '/api/config'
        },
        OPENAI_API_KEY: '',
        openai: {
            model: 'gpt-4',
            maxTokens: 1000,
            temperature: 0.7,
            apiKey: '' // Additional fallback
        },
        DEBUG_MODE: false,
        features: {
            faceRecognition: true,
            speechAnalysis: true,
            nlpAnalysis: true,
            realTimeAnalysis: true
        },
        interview: {
            maxDuration: 3600,
            defaultTimeLimit: 1800,
            reminderIntervals: [24, 1], // hours before interview
            allowedFileTypes: ['video/webm', 'video/mp4'],
            maxFileSize: 100 * 1024 * 1024,
            recordingQuality: {
                audio: {
                    sampleRate: 48000,
                    channelCount: 2,
                    echoCancellation: true,
                    noiseSuppression: true
                },
                video: {
                    width: 1280,
                    height: 720,
                    frameRate: 30
                }
            }
        },
        security: {
            encryptionKey: null,
            tokenExpiration: '24h'
        },
        analytics: {
            trackingEnabled: true,
            sessionRecording: false
        }
    };

    // Create a config object with safe getter and setter
    const configObject = {
        _config: { ...defaultConfig },
        _listeners: [],
        
        // Deep get method with optional chaining and fallback
        get(key, defaultValue = undefined) {
            const keys = key.split('.');
            return keys.reduce((obj, k) => 
                (obj && obj[k] !== undefined) ? obj[k] : 
                (defaultValue !== undefined ? defaultValue : undefined), 
                this._config
            );
        },
        
        // Setter method with deep object support
        set(key, value) {
            const keys = key.split('.');
            let current = this._config;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in current)) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            const lastKey = keys[keys.length - 1];
            const oldValue = current[lastKey];
            current[lastKey] = value;

            // Trigger change listeners
            this._listeners.forEach(listener => {
                if (listener.key === key || key.startsWith(listener.key)) {
                    listener.callback(value, oldValue);
                }
            });

            return value;
        },

        // Add change listener
        onChange(key, callback) {
            this._listeners.push({ key, callback });
        },

        // Remove change listener
        removeListener(key, callback) {
            this._listeners = this._listeners.filter(
                listener => !(listener.key === key && listener.callback === callback)
            );
        },

        // Validate configuration
        validate() {
            const errors = [];
            
            // Validate API Base URL
            if (!this._config.API_BASE_URL) {
                errors.push('API Base URL is required');
            }

            // Validate interview recording settings
            const videoSettings = this._config.interview.recordingQuality.video;
            if (videoSettings.width < 640 || videoSettings.height < 480) {
                errors.push('Video recording quality is too low');
            }

            // Validate OpenAI settings
            if (!this._config.openai.model) {
                errors.push('OpenAI model is required');
            }

            // Validate interview settings
            if (this._config.interview.maxDuration <= 0) {
                errors.push('Invalid maximum interview duration');
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        },

        // Reset to default configuration
        reset() {
            this._config = { ...defaultConfig };
            this._listeners.forEach(listener => {
                listener.callback(this._config, {});
            });
        },

        // Export configuration as JSON
        toJSON() {
            return JSON.stringify(this._config, null, 2);
        },

        // Async configuration loader with extensive error handling
        async load() {
            try {
                const baseURL = this._config.API_BASE_URL;
                const response = await fetch(`${baseURL}/api/config`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const serverConfig = await response.json();
                
                // Merge server config with default config
                Object.keys(serverConfig).forEach(key => {
                    if (typeof serverConfig[key] === 'object' && serverConfig[key] !== null) {
                        this.set(key, {
                            ...defaultConfig[key],
                            ...serverConfig[key]
                        });
                    } else {
                        this.set(key, serverConfig[key]);
                    }
                });

                // Validate configuration
                const validationResult = this.validate();
                if (!validationResult.isValid) {
                    console.warn('Configuration validation failed:', validationResult.errors);
                }

            } catch (error) {
                console.warn('Failed to load server config, using defaults:', error);
            } finally {
                // Always expose config globally
                window.config = this;
                
                // Dispatch events to notify scripts
                window.dispatchEvent(new Event('configLoaded'));
                
                // Log final config for debugging
                console.log('Final Configuration:', this._config);
            }

            return this._config;
        }
    };

    // Initialize config loading
    configObject.load();
})();