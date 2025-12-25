const Task = require('../models/Task');
const { sendEmail, canSendEmail } = require('./emailService');

// Send email reminder
const sendEmailReminder = async (user, task) => {
  // Check if email sending is enabled
  const emailEnabled = await canSendEmail();
  if (!emailEnabled) {
    console.log('Email sending disabled. Skipping email reminder.');
    return;
  }

  const dueDate = new Date(task.dueDate).toLocaleString();
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .task-card { background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Task Reminder</h2>
          <p>Hello ${user.firstName || user.username},</p>
          <p>This is a reminder that your task is due soon:</p>
          <div class="task-card">
            <h3>${task.title}</h3>
            ${task.description ? `<p>${task.description}</p>` : ''}
            <p><strong>Due Date:</strong> ${dueDate}</p>
            <p><strong>Priority:</strong> ${task.priority}</p>
          </div>
          <p>Please complete this task before the deadline.</p>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: `Reminder: ${task.title} is due soon`,
    html
  });
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
