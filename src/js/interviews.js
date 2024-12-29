import interviewService from './services/interviewService.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const elements = {
        interviewsList: document.getElementById('interviewsList'),
        exportButton: document.getElementById('exportButton'),
        loadingSpinner: document.createElement('div'),
        errorAlert: document.createElement('div')
    };

    // Initialize UI elements
    initializeUI();

    // Initial render
    renderInterviews();

    // Event Listeners
    if (elements.exportButton) {
        elements.exportButton.addEventListener('click', handleExport);
    }

    // Initialize UI components
    function initializeUI() {
        // Setup loading spinner
        elements.loadingSpinner.className = 'd-none text-center my-4';
        elements.loadingSpinner.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        elements.interviewsList.parentNode.insertBefore(elements.loadingSpinner, elements.interviewsList);

        // Setup error alert
        elements.errorAlert.className = 'alert alert-danger d-none my-3';
        elements.interviewsList.parentNode.insertBefore(elements.errorAlert, elements.interviewsList);
    }

    // Main render function
    async function renderInterviews() {
        showLoading(true);
        try {
            const interviews = await interviewService.getAllInterviews();
            renderInterviewsList(interviews);
            elements.errorAlert.className = 'alert alert-danger d-none';
        } catch (error) {
            showError(error.message);
        } finally {
            showLoading(false);
        }
    }

    // Render interviews list
    function renderInterviewsList(interviews) {
        if (!elements.interviewsList) return;

        if (interviews.length === 0) {
            elements.interviewsList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No interviews scheduled yet.</td>
                </tr>`;
            return;
        }

        elements.interviewsList.innerHTML = interviews.map(interview => `
            <tr>
                <td>${interview.candidateName}</td>
                <td>${interview.candidateEmail}</td>
                <td>${interviewService.formatInterviewDate(interview.interviewDate)}</td>
                <td>${formatInterviewType(interview.interviewType)}</td>
                <td>${generateStatusBadge(interview.status)}</td>
                <td>
                    <div class="btn-group" role="group">
                        ${generateActionButtons(interview)}
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners to newly created buttons
        addButtonEventListeners();
    }

    // Helper Functions
    function formatInterviewType(type) {
        const types = {
            technical: 'Technical',
            hr: 'HR',
            final: 'Final Round'
        };
        return types[type] || type;
    }

    function generateStatusBadge(status) {
        const badges = {
            scheduled: 'primary',
            completed: 'success',
            cancelled: 'danger',
            rescheduled: 'warning'
        };
        return `
            <span class="badge bg-${badges[status] || 'secondary'}">
                ${status.charAt(0).toUpperCase() + status.slice(1)}
            </span>`;
    }

    function generateActionButtons(interview) {
        return `
            <button class="btn btn-sm btn-outline-primary me-1" 
                    data-action="update" 
                    data-id="${interview._id}"
                    ${interview.status === 'cancelled' ? 'disabled' : ''}>
                Update Status
            </button>
            <button class="btn btn-sm btn-outline-danger" 
                    data-action="delete" 
                    data-id="${interview._id}">
                Delete
            </button>`;
    }

    function addButtonEventListeners() {
        document.querySelectorAll('button[data-action]').forEach(button => {
            button.addEventListener('click', handleAction);
        });
    }

    // Action Handlers
    async function handleAction(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;
        const id = button.dataset.id;

        try {
            if (action === 'delete') {
                if (await confirmAction('Are you sure you want to delete this interview?')) {
                    await handleDelete(id);
                }
            } else if (action === 'update') {
                await handleStatusUpdate(id);
            }
        } catch (error) {
            showError(error.message);
        }
    }

    async function handleDelete(id) {
        showLoading(true);
        try {
            await interviewService.deleteInterview(id);
            await renderInterviews();
            showSuccess('Interview deleted successfully');
        } catch (error) {
            showError(error.message);
        } finally {
            showLoading(false);
        }
    }

    async function handleStatusUpdate(id) {
        const newStatus = await promptStatus();
        if (!newStatus) return;

        showLoading(true);
        try {
            await interviewService.updateInterviewStatus(id, newStatus);
            await renderInterviews();
            showSuccess('Interview status updated successfully');
        } catch (error) {
            showError(error.message);
        } finally {
            showLoading(false);
        }
    }

    async function handleExport() {
        try {
            const interviews = await interviewService.getAllInterviews();
            const csv = interviewService.generateCSV(interviews);
            downloadCSV(csv);
        } catch (error) {
            showError(error.message);
        }
    }

    // Utility Functions
    function showLoading(show) {
        elements.loadingSpinner.className = show ? 'text-center my-4' : 'd-none';
    }

    function showError(message) {
        elements.errorAlert.className = 'alert alert-danger my-3';
        elements.errorAlert.textContent = message;
    }

    function showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        elements.interviewsList.parentNode.insertBefore(alert, elements.interviewsList);
        setTimeout(() => alert.remove(), 3000);
    }

    function confirmAction(message) {
        return window.confirm(message);
    }

    async function promptStatus() {
        const statuses = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
        const status = prompt(
            `Enter new status (${statuses.join(', ')}):`,
            'completed'
        );
        return statuses.includes(status) ? status : null;
    }

    function downloadCSV(csv) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `interviews_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});