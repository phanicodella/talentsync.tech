// src/js/services/emailService.js
import nodemailer from 'nodemailer';
import config from './config.js';
import { encryptData } from './encryptionService.js';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport(config.SMTP_CONFIG);
    }

    async sendInterviewInvite(interview) {
        const template = this.getInterviewInviteTemplate(interview);
        await this.sendEmail({
            to: interview.email,
            subject: `Interview Scheduled - ${interview.type}`,
            html: template
        });

        this.scheduleReminders(interview);
    }

    async sendInterviewReminder(interview) {
        const template = this.getReminderTemplate(interview);
        await this.sendEmail({
            to: interview.email,
            subject: `Reminder: Upcoming Interview - ${interview.type}`,
            html: template
        });
    }

    async scheduleReminders(interview) {
        const interviewDate = new Date(interview.date);
        
        for (const hours of config.interview.reminderIntervals) {
            const reminderDate = new Date(interviewDate.getTime() - (hours * 60 * 60 * 1000));
            const now = new Date();
            
            if (reminderDate > now) {
                setTimeout(() => {
                    this.sendInterviewReminder(interview);
                }, reminderDate.getTime() - now.getTime());
            }
        }
    }

    async sendEmail(options) {
        try {
            const encryptedContent = encryptData(options.html);
            await this.transporter.sendMail({
                from: config.SMTP_CONFIG.auth.user,
                to: options.to,
                subject: options.subject,
                html: encryptedContent,
                headers: {
                    'X-Priority': '1',
                    'X-Encrypted': 'true'
                }
            });
            this.logEmailSent(options.to, options.subject);
        } catch (error) {
            console.error('Email sending failed:', error);
            throw error;
        }
    }

    getInterviewInviteTemplate(interview) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Interview Scheduled</h2>
                <p>Dear ${interview.name},</p>
                <p>Your ${interview.type} interview has been scheduled.</p>
                <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
                    <p><strong>Date:</strong> ${new Date(interview.date).toLocaleString()}</p>
                    <p><strong>Type:</strong> ${interview.type}</p>
                    <p><strong>Location:</strong> Online Video Interview</p>
                </div>
                <p><a href="${config.API_BASE_URL}/interview/${interview.id}" 
                      style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Join Interview
                </a></p>
                <p>Please ensure:</p>
                <ul>
                    <li>Stable internet connection</li>
                    <li>Working camera and microphone</li>
                    <li>Quiet environment</li>
                </ul>
                <p>Best regards,<br>TalentSync Team</p>
            </div>
        `;
    }

    getReminderTemplate(interview) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Interview Reminder</h2>
                <p>Dear ${interview.name},</p>
                <p>This is a reminder of your upcoming ${interview.type} interview.</p>
                <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
                    <p><strong>Date:</strong> ${new Date(interview.date).toLocaleString()}</p>
                    <p><strong>Type:</strong> ${interview.type}</p>
                </div>
                <p><a href="${config.API_BASE_URL}/interview/${interview.id}" 
                      style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Join Interview
                </a></p>
            </div>
        `;
    }

    logEmailSent(recipient, subject) {
        const log = {
            timestamp: new Date().toISOString(),
            recipient,
            subject,
            success: true
        };
        
        let emailLogs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
        emailLogs.push(log);
        localStorage.setItem('emailLogs', JSON.stringify(emailLogs));
    }
}

export default new EmailService();