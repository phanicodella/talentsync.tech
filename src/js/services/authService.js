// src/js/services/authService.js

class AuthService {
    constructor() {
        this.baseURL = window.config?.get('API_BASE_URL', 'http://localhost:5000');
        this.tokenKey = 'authToken';
        this.userKey = 'currentUser';

        // Initialize authentication state
        this.initializeAuthState();
    }

    // Initialize authentication state
    initializeAuthState() {
        const token = this.getToken();
        if (token) {
            this.validateToken(token)
                .catch(() => this.logout());
        }
    }

    // Validate token with backend
    async validateToken(token) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/me`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Invalid token');
            }

            const userData = await response.json();
            this.setUser(userData.user);
            return true;
        } catch (error) {
            console.warn('Token validation failed:', error);
            this.logout();
            return false;
        }
    }

    // User registration
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await this.handleResponse(response);

            // Store token and user information
            this.setToken(data.token);
            this.setUser(data.user);

            return data.user;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    // User login
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await this.handleResponse(response);

            // Store token and user information
            this.setToken(data.token);
            this.setUser(data.user);

            return data.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Join interview as candidate
    async joinInterview(interviewId, candidateName) {
        try {
            const response = await fetch(`${this.baseURL}/api/interviews/verify/${interviewId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ candidateName })
            });

            const data = await this.handleResponse(response);

            // Store temporary interview token
            sessionStorage.setItem('interviewToken', data.token);
            sessionStorage.setItem('candidateName', candidateName);

            return data;
        } catch (error) {
            console.error('Interview join error:', error);
            throw error;
        }
    }

    // Handle API response
    async handleResponse(response) {
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    }

    // Logout user
    logout() {
        // Clear local and session storage
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        sessionStorage.removeItem('interviewToken');
        sessionStorage.removeItem('candidateName');

        // Redirect to login page
        window.location.href = '/login.html';
    }

    // Token management
    getToken() {
        // Prioritize regular auth token, fallback to interview token
        return localStorage.getItem(this.tokenKey) || 
               sessionStorage.getItem('interviewToken');
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    // User management
    getUser() {
        const userStr = localStorage.getItem(this.userKey);
        return userStr ? JSON.parse(userStr) : null;
    }

    setUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    // Authentication status checks
    isAuthenticated() {
        return !!this.getToken();
    }

    hasRole(role) {
        const user = this.getUser();
        return user && user.role === role;
    }

    // Get current user role
    getUserRole() {
        const user = this.getUser();
        return user ? user.role : null;
    }

    // Check if current session is a candidate interview
    isCandidateSession() {
        return !!sessionStorage.getItem('interviewToken');
    }

    // Get candidate name for interview
    getCandidateName() {
        return sessionStorage.getItem('candidateName');
    }

    // Profile update
    async updateProfile(profileData) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(profileData)
            });

            const data = await this.handleResponse(response);

            // Update local user data
            this.setUser(data.user);

            return data.user;
        } catch (error) {
            console.error('Profile update error:', error);
            throw error;
        }
    }

    // Password reset request
    async requestPasswordReset(email) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/password/reset-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Password reset request error:', error);
            throw error;
        }
    }

    // Reset password
    async resetPassword(token, newPassword) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/password/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, newPassword })
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;
