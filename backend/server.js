const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const projectRoutes = require('./routes/projects');
const listRoutes = require('./routes/lists');
const labelRoutes = require('./routes/labels');
const commentRoutes = require('./routes/comments');
const backupRoutes = require('./routes/backup');
const googleCalendarRoutes = require('./routes/googleCalendar');
const adminRoutes = require('./routes/admin');
const smartEngineRoutes = require('./routes/smartEngine');

// Import reminder service
const reminderService = require('./services/reminderService');

// Import middleware
const { checkMaintenanceMode } = require('./middleware/maintenance');
const { checkProjectLimit, checkTaskLimit } = require('./middleware/limits');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Maintenance mode check (before routes)
app.use(checkMaintenanceMode);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/projex')
.then(async () => {
  console.log('MongoDB connected successfully');
  
  // Bootstrap site settings on startup
  try {
    const SiteSettings = require('./models/SiteSettings');
    await SiteSettings.getSettings();
    console.log('Site settings initialized');
  } catch (error) {
    console.error('Error initializing site settings:', error);
  }
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', checkTaskLimit, taskRoutes);
app.use('/api/projects', checkProjectLimit, projectRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/internal/smart-engine', smartEngineRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Projex API is running' });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Schedule reminder checks every hour
cron.schedule('0 * * * *', () => {
  reminderService.checkAndSendReminders();
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
