// src/js/index.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('interviewForm');
    
    if (!form) return; // Guard clause if we're not on the form page
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Form handling logic
        const formData = {
            name: document.getElementById('candidateName').value.trim(),
            email: document.getElementById('candidateEmail').value.trim(),
            phone: document.getElementById('candidatePhone').value.trim(),
            date: document.getElementById('interviewDate').value,
            type: document.getElementById('interviewType').value,
            notes: document.getElementById('notes').value.trim()
        };
        
        if (validateForm(formData)) {
            saveInterview(formData);
            window.location.href = 'interviews.html';
        }
    });
});

function validateForm(data) {
    const errors = [];
    
    // Name validation
    if (!data.name || data.name.length < 2 || !/^[a-zA-Z\s]+$/.test(data.name)) {
        errors.push("Please enter a valid name (at least 2 characters, letters only)");
    }
    
    // Email validation
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push("Please enter a valid email address");
    }
    
    // Phone validation (optional)
    if (data.phone && !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im.test(data.phone)) {
        errors.push("Please enter a valid phone number or leave blank");
    }
    
    // Date validation
    const selectedDate = new Date(data.date);
    if (!data.date || selectedDate <= new Date()) {
        errors.push("Please select a future date and time");
    }
    
    // Display errors if any
    const errorContainer = document.getElementById('errorContainer');
    if (errors.length > 0) {
        errorContainer.innerHTML = errors.map(error => 
            `<div class="alert alert-danger">${error}</div>`
        ).join('');
        errorContainer.style.display = 'block';
        return false;
    }
    
    // Clear previous errors
    errorContainer.style.display = 'none';
    errorContainer.innerHTML = '';
    return true;
}

function saveInterview(data) {
    const interview = {
        id: Date.now(),
        ...data,
        status: 'scheduled',
        createdAt: new Date().toISOString()
    };
    
    let interviews = JSON.parse(localStorage.getItem('interviews') || '[]');
    interviews.push(interview);
    localStorage.setItem('interviews', JSON.stringify(interviews));
}