document.addEventListener('DOMContentLoaded', () => {
    function renderInterviews() {
        const interviewsList = document.getElementById('interviewsList');
        const interviews = JSON.parse(localStorage.getItem('interviews') || '[]');
        
        interviewsList.innerHTML = ''; // Clear existing rows
        
        if (interviews.length === 0) {
            interviewsList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No interviews scheduled yet.</td>
                </tr>
            `;
            return;
        }
        
        interviews.forEach((interview, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${interview.name}</td>
                <td>${interview.email}</td>
                <td>${new Date(interview.date).toLocaleString()}</td>
                <td>${interview.type}</td>
                <td>
                    <span class="badge ${
                        interview.status === 'scheduled' ? 'bg-primary' : 
                        interview.status === 'completed' ? 'bg-success' : 'bg-warning'
                    }">
                        ${interview.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger me-1" onclick="deleteInterview(${index})">Delete</button>
                    <button class="btn btn-sm btn-secondary" onclick="updateStatus(${index})">Update Status</button>
                </td>
            `;
            interviewsList.appendChild(row);
        });
    }

    window.deleteInterview = function(index) {
        const interviews = JSON.parse(localStorage.getItem('interviews') || '[]');
        interviews.splice(index, 1);
        localStorage.setItem('interviews', JSON.stringify(interviews));
        renderInterviews();
    }

    window.updateStatus = function(index) {
        const interviews = JSON.parse(localStorage.getItem('interviews') || '[]');
        const statuses = ['scheduled', 'completed', 'cancelled'];
        const currentStatusIndex = statuses.indexOf(interviews[index].status);
        interviews[index].status = statuses[(currentStatusIndex + 1) % statuses.length];
        localStorage.setItem('interviews', JSON.stringify(interviews));
        renderInterviews();
    }

    // Export functionality
    document.getElementById('exportButton').addEventListener('click', function() {
        const interviews = JSON.parse(localStorage.getItem('interviews') || '[]');
        
        if (interviews.length === 0) {
            alert('No interviews to export.');
            return;
        }
        
        function convertToCSV(data) {
            const headers = ['Name', 'Email', 'Phone', 'Date', 'Type', 'Status', 'Notes'];
            
            const csvRows = data.map(interview => [
                interview.name,
                interview.email,
                interview.phone,
                new Date(interview.date).toLocaleString(),
                interview.type,
                interview.status,
                interview.notes.replace(/,/g, ';')
            ]);
            
            return [
                headers.join(','),
                ...csvRows.map(row => row.map(field => 
                    `"${field}"`
                ).join(','))
            ].join('\n');
        }
        
        const csvContent = convertToCSV(interviews);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        const filename = `talentsync_interviews_${new Date().toISOString().split('T')[0]}.csv`;
        
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, filename);
        } else {
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    // Initial render
    renderInterviews();
});