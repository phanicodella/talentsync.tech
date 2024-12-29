// src/js/services/configService.js

class ConfigService {
    constructor() {
        this.baseURL = this.determineBaseURL();
        this.configCache = new Map();
        this.listeners = new Map();
    }

    // Determine base URL dynamically
    determineBaseURL() {
        const hostname = window.location.hostname;
        switch (hostname) {
            case 'localhost':
                return 'http://localhost:5000';
            case 'talentsync.vercel.app':
                return 'https://talentsync-backend.herokuapp.com';
            default:
                return window.location.origin;
        }
    }

    // Load configuration from backend
    async loadConfig() {
        try {
            const response = await fetch(`${this.baseURL}/api/config`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load configuration');
            }

            const config = await response.json();
            
            // Cache and notify listeners
            this.updateConfig(config);

            return config;
        } catch (error) {
            console.warn('Configuration loading failed:', error);
            return this.getDefaultConfig();
        }
    }

    // Get default configuration
    getDefaultConfig() {
        return {
            features: {
                interviews: {
                    enabled: true,
                    maxDuration: 3600
                },
                aiAnalysis: {
                    enabled: true,
                    providers: ['openai']
                }
            },
            openai: {
                model: 'gpt-4',
                maxTokens: 1000,
                apiKeyConfigured: false
            },
            interview: {
                recordingQuality: {
                    audio: {
                        sampleRate: 48000,
                        channelCount: 2
                    },
                    video: {
                        width: 1280,
                        height: 720
                    }
                }
            }
        };
    }

    // Update configuration and notify listeners
    updateConfig(newConfig) {
        // Merge new config with existing
        const mergedConfig = { ...this.configCache, ...newConfig };
        
        // Update cache
        Object.entries(mergedConfig).forEach(([key, value]) => {
            this.configCache.set(key, value);
        });

        // Notify listeners
        this.listeners.forEach((callbacks, key) => {
            callbacks.forEach(callback => {
                try {
                    callback(this.configCache.get(key));
                } catch (error) {
                    console.error(`Error in config listener for ${key}:`, error);
                }
            });
        });
    }

    // Get configuration value
    get(key, defaultValue = undefined) {
        // Split nested keys
        const keys = key.split('.');
        let current = this.configCache;

        for (const k of keys) {
            if (current instanceof Map) {
                current = current.get(k);
            } else if (current && typeof current === 'object') {
                current = current[k];
            } else {
                return defaultValue;
            }

            if (current === undefined) {
                return defaultValue;
            }
        }

        return current;
    }

    // Set configuration value
    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        
        let current = this.configCache;
        
        // Navigate to the parent object
        for (const k of keys) {
            if (!(k in current)) {
                current[k] = {};
            }
            current = current[k];
        }

        // Set the value
        current[lastKey] = value;

        // Notify listeners
        this.notifyListeners(key, value);
    }

    // Add configuration change listener
    onChange(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    // Remove configuration change listener
    removeListener(key, callback) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.delete(callback);
        }
    }

    // Notify listeners for a specific key
    notifyListeners(key, value) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error(`Error in config listener for ${key}:`, error);
                }
            });
        }
    }

    // Validate configuration
    validate() {
        const errors = [];

        // Validate required configuration keys
        const requiredKeys = [
            'features.interviews.enabled',
            'openai.model',
            'interview.recordingQuality.video.width'
        ];

        requiredKeys.forEach(key => {
            const value = this.get(key);
            if (value === undefined) {
                errors.push(`Missing required configuration: ${key}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Reset to default configuration
    reset() {
        this.configCache.clear();
        this.updateConfig(this.getDefaultConfig());
    }
}

// Create and export singleton instance
const configService = new ConfigService();

// Automatically load configuration on script load
configService.loadConfig();

// Expose globally for compatibility
window.config = configService;

export default configService;
