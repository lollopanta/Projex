const Task = require('../models/Task');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Email transporter setup
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email configuration not set. Email reminders will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const transporter = createTransporter();

// Send email reminder
const sendEmailReminder = async (user, task) => {
  if (!transporter) {
    console.log('Email transporter not configured. Skipping email reminder.');
    return;
  }

  try {
    const dueDate = new Date(task.dueDate).toLocaleString();
    const mailOptions = {
      from: `"Projex" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Reminder: ${task.title} is due soon`,
      html: `
        <h2>Task Reminder</h2>
        <p>Hello ${user.firstName || user.username},</p>
        <p>This is a reminder that your task <strong>${task.title}</strong> is due on ${dueDate}.</p>
        ${task.description ? `<p>Description: ${task.description}</p>` : ''}
        <p>Priority: ${task.priority}</p>
        <p>Please complete this task before the deadline.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email reminder sent to ${user.email} for task: ${task.title}`);
  } catch (error) {
    console.error('Error sending email reminder:', error);
  }
};

// Check and send reminders
const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const tasks = await Task.find({
      completed: false,
      dueDate: { $exists: true, $ne: null },
      'reminders.sent': false
    })
      .populate('createdBy', 'email firstName username preferences')
      .populate('assignedTo', 'email firstName username preferences');

    for (const task of tasks) {
      if (!task.dueDate) continue;

      const dueDate = new Date(task.dueDate);
      const timeUntilDue = dueDate.getTime() - now.getTime();
      const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);

      for (let i = 0; i < task.reminders.length; i++) {
        const reminder = task.reminders[i];
        if (reminder.sent) continue;

        // Check if it's time to send the reminder
        if (hoursUntilDue <= reminder.timeBefore && hoursUntilDue > 0) {
          // Send to assigned users or task creator
          const usersToNotify = task.assignedTo.length > 0 
            ? task.assignedTo 
            : [task.createdBy];

          for (const user of usersToNotify) {
            if (!user) continue;

            // Check user preferences
            if (reminder.type === 'email' && user.preferences?.emailNotifications !== false) {
              await sendEmailReminder(user, task);
            }

            // Push notifications would be implemented here
            if (reminder.type === 'push' && user.preferences?.pushNotifications !== false) {
              // TODO: Implement push notification service
              console.log(`Push notification reminder for ${user.email}: ${task.title}`);
            }
          }

          // Mark reminder as sent
          task.reminders[i].sent = true;
          task.reminders[i].sentAt = new Date();
        }
      }

      await task.save();
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
};

module.exports = {
  checkAndSendReminders,
  sendEmailReminder
};
