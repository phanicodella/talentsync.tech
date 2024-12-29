// src/js/utils/route-guard.js

import authService from '../services/authService.js';

export const routeGuard = {
    guardRoute(allowedRoles = []) {
        const token = authService.getToken();
        const user = authService.getUser();

        // No token or user
        if (!token || !user) {
            window.location.href = '/login.html';
            return false;
        }

        // Check roles if specified
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            window.location.href = '/interviews.html';
            return false;
        }

        return true;
    },

    // Protect routes with specific requirements
    protectRoutes() {
        const currentPath = window.location.pathname;

        const routeRules = {
            '/interviews.html': ['interviewer', 'admin'],
            '/interview-room.html': ['interviewer', 'admin', 'candidate'],
            '/index.html': ['interviewer', 'admin']
        };

        const requiredRoles = routeRules[currentPath] || [];
        
        if (!this.guardRoute(requiredRoles)) {
            console.warn('Unauthorized route access');
        }
    }
};

// Auto-protect routes on page load
document.addEventListener('DOMContentLoaded', () => {
    routeGuard.protectRoutes();
});

export default routeGuard;
