import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EmailOptions {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private usesSendGrid: boolean = false;

  constructor() {
    this.initializeEmailService();
    this.startReminderScheduler();
  }

  private initializeEmailService() {
    if (process.env.SENDGRID_API_KEY) {
      // Use SendGrid
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.usesSendGrid = true;
      console.log('Email service initialized with SendGrid');
    } else if (process.env.SMTP_HOST) {
      // Use SMTP
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('Email service initialized with SMTP');
    } else {
      console.warn('No email configuration found. Emails will be logged to console.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.usesSendGrid && process.env.SENDGRID_API_KEY) {
        await this.sendWithSendGrid(options);
      } else if (this.transporter) {
        await this.sendWithSMTP(options);
      } else {
        this.logEmail(options);
      }
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  private async sendWithSendGrid(options: EmailOptions) {
    const msg = {
      to: options.to,
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      subject: options.subject,
      text: options.text,
      html: options.html || options.text
    };

    await sgMail.sendMultiple(msg);
    console.log('Email sent via SendGrid to:', options.to);
  }

  private async sendWithSMTP(options: EmailOptions) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      to: options.to.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html || options.text
    };

    await this.transporter!.sendMail(mailOptions);
    console.log('Email sent via SMTP to:', options.to);
  }

  private logEmail(options: EmailOptions) {
    console.log('=== EMAIL (Console Output) ===');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Body:', options.text);
    console.log('=============================');
  }

  async sendBatchReminder(batchEventId: number, userEmails: string[]) {
    try {
      const batchEvent = await prisma.batchEvent.findUnique({
        where: { id: batchEventId },
        include: {
          equipment: { select: { name: true } }
        }
      });

      if (!batchEvent) {
        console.error('Batch event not found:', batchEventId);
        return false;
      }

      const subject = `Batch Reminder: ${batchEvent.batchNo} starting soon`;
      const text = `
        Batch Event Reminder
        
        Batch No: ${batchEvent.batchNo}
        Product: ${batchEvent.productName}
        Equipment: ${batchEvent.equipment.name}
        Scheduled Start: ${batchEvent.startTimestamp.toLocaleString()}
        Scheduled End: ${batchEvent.endTimestamp.toLocaleString()}
        
        This batch is scheduled to start in approximately 1 hour.
        
        Best regards,
        Batch Processing Assistant
      `;

      return await this.sendEmail({
        to: userEmails,
        subject,
        text
      });
    } catch (error) {
      console.error('Error sending batch reminder:', error);
      return false;
    }
  }

  async sendMaintenanceReminder(maintenanceEventId: number, userEmails: string[]) {
    try {
      const maintenanceEvent = await prisma.maintenanceEvent.findUnique({
        where: { id: maintenanceEventId },
        include: {
          equipment: { select: { name: true } }
        }
      });

      if (!maintenanceEvent) {
        console.error('Maintenance event not found:', maintenanceEventId);
        return false;
      }

      const subject = `Maintenance Reminder: ${maintenanceEvent.equipment.name} maintenance starting soon`;
      const text = `
        Maintenance Event Reminder
        
        Equipment: ${maintenanceEvent.equipment.name}
        Reason: ${maintenanceEvent.reason}
        Supervisor: ${maintenanceEvent.supervisorName || 'Not assigned'}
        Scheduled Start: ${maintenanceEvent.startTimestamp.toLocaleString()}
        Scheduled End: ${maintenanceEvent.endTimestamp.toLocaleString()}
        Expected Duration: ${maintenanceEvent.expectedDuration || 'Not specified'}
        
        This maintenance is scheduled to start in approximately 1 hour.
        
        Best regards,
        Batch Processing Assistant
      `;

      return await this.sendEmail({
        to: userEmails,
        subject,
        text
      });
    } catch (error) {
      console.error('Error sending maintenance reminder:', error);
      return false;
    }
  }

  private startReminderScheduler() {
    // Run every 5 minutes to check for upcoming events
    cron.schedule('*/5 * * * *', async () => {
      await this.checkAndSendReminders();
    });

    console.log('Email reminder scheduler started (runs every 5 minutes)');
  }

  private async checkAndSendReminders() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      // Find batch events starting in the next hour that haven't been reminded yet
      const upcomingBatchEvents = await prisma.batchEvent.findMany({
        where: {
          startTimestamp: {
            gte: fiveMinutesFromNow,
            lte: oneHourFromNow
          },
          notifications: {
            none: {
              type: 'batch_reminder',
              sentTimestamp: {
                gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) // Don't send if already sent in last 2 hours
              }
            }
          }
        },
        include: {
          equipment: { select: { name: true } }
        }
      });

      // Find maintenance events starting in the next hour that haven't been reminded yet
      const upcomingMaintenanceEvents = await prisma.maintenanceEvent.findMany({
        where: {
          startTimestamp: {
            gte: fiveMinutesFromNow,
            lte: oneHourFromNow
          },
          notifications: {
            none: {
              type: 'maintenance_reminder',
              sentTimestamp: {
                gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) // Don't send if already sent in last 2 hours
              }
            }
          }
        },
        include: {
          equipment: { select: { name: true } }
        }
      });

      // Get all users who should receive reminders (admins and planners)
      const users = await prisma.user.findMany({
        where: {
          role: { in: ['admin', 'planner'] }
        },
        select: { id: true, email: true }
      });

      const userEmails = users.map(u => u.email);

      // Send batch reminders
      for (const batchEvent of upcomingBatchEvents) {
        const success = await this.sendBatchReminder(batchEvent.id, userEmails);

        if (success) {
          // Record notifications
          await Promise.all(
            users.map(user =>
              prisma.notification.create({
                data: {
                  userId: user.id,
                  batchEventId: batchEvent.id,
                  type: 'batch_reminder',
                  sentTimestamp: new Date(),
                  message: `Reminder sent for batch ${batchEvent.batchNo} on ${batchEvent.equipment.name}`
                }
              })
            )
          );
        }
      }

      // Send maintenance reminders
      for (const maintenanceEvent of upcomingMaintenanceEvents) {
        const success = await this.sendMaintenanceReminder(maintenanceEvent.id, userEmails);

        if (success) {
          // Record notifications
          await Promise.all(
            users.map(user =>
              prisma.notification.create({
                data: {
                  userId: user.id,
                  maintenanceEventId: maintenanceEvent.id,
                  type: 'maintenance_reminder',
                  sentTimestamp: new Date(),
                  message: `Reminder sent for maintenance on ${maintenanceEvent.equipment.name}`
                }
              })
            )
          );
        }
      }

      if (upcomingBatchEvents.length > 0 || upcomingMaintenanceEvents.length > 0) {
        console.log(`Sent reminders for ${upcomingBatchEvents.length} batch events and ${upcomingMaintenanceEvents.length} maintenance events`);
      }
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;