# Projex - Task Management App

A modern, feature-rich task management application similar to Vikunja, built with the MERN stack (MongoDB, Express, React, Node.js). Designed for both teams and individual users to manage tasks, projects, and deadlines efficiently.

## Features

### Core Features
- ✅ **Task Management**: Create, edit, delete, and organize tasks
- ✅ **Projects & Lists**: Organize tasks into projects and lists
- ✅ **Subtasks**: Break down large tasks into manageable subtasks
- ✅ **Priority Levels**: Categorize tasks by priority (low, medium, high)
- ✅ **Labels/Tags**: Customizable labels for task categorization
- ✅ **Due Dates & Reminders**: Set deadlines and receive email reminders
- ✅ **Recurring Tasks**: Support for daily, weekly, monthly recurring tasks
- ✅ **Collaboration**: Assign tasks, share projects/lists, and comment on tasks
- ✅ **Advanced Filtering**: Filter tasks by priority, due date, labels, assigned user
- ✅ **Search**: Full-text search across tasks
- ✅ **Dark/Light Mode**: Theme customization
- ✅ **User Authentication**: JWT-based authentication with 2FA support
- ✅ **Role-Based Access Control**: Viewer, Editor, Admin roles
- ✅ **Backup & Restore**: Export and import user data
- ✅ **Google Calendar Integration**: Sync tasks with Google Calendar
- ✅ **Responsive Design**: Optimized for desktop and mobile

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Speakeasy** - Two-factor authentication
- **Nodemailer** - Email notifications
- **Google APIs** - Calendar integration
- **Node-cron** - Scheduled tasks

### Frontend
- **React** - UI library
- **React Router** - Routing
- **React Query** - Data fetching
- **Axios** - HTTP client
- **Date-fns** - Date utilities
- **React Hot Toast** - Notifications
- **React Icons** - Icon library

## Project Structure

```
projex/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/     # Auth & RBAC middleware
│   ├── services/        # Business logic services
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React contexts
│   │   └── App.js       # Main app component
│   └── public/          # Static files
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/projex
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

5. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

### Running Both Servers

From the root directory:
```bash
npm run dev
```

This will start both backend and frontend concurrently.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/enable-2fa` - Enable 2FA
- `POST /api/auth/verify-2fa` - Verify 2FA token
- `POST /api/auth/disable-2fa` - Disable 2FA

### Tasks
- `GET /api/tasks` - Get all tasks (with filters)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/complete` - Toggle completion
- `POST /api/tasks/:id/subtasks` - Add subtask

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add member
- `DELETE /api/projects/:id/members/:memberId` - Remove member

### Lists
- `GET /api/lists` - Get all lists
- `GET /api/lists/:id` - Get single list
- `POST /api/lists` - Create list
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list
- `POST /api/lists/:id/members` - Add member

### Labels
- `GET /api/labels` - Get all labels
- `POST /api/labels` - Create label
- `PUT /api/labels/:id` - Update label
- `DELETE /api/labels/:id` - Delete label

### Comments
- `GET /api/comments/task/:taskId` - Get task comments
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Backup
- `GET /api/backup/export` - Export user data
- `POST /api/backup/import` - Import user data

## Usage

### Creating a Task
1. Navigate to Tasks page
2. Click "New Task"
3. Fill in task details (title, description, list, priority, due date)
4. Click "Create"

### Setting Up 2FA
1. Go to Settings
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with authenticator app
4. Enter verification code to confirm

### Google Calendar Integration
1. Go to Settings
2. Click "Connect Google Calendar"
3. Authorize the application
4. Tasks with due dates will automatically sync to your calendar

### Exporting Data
1. Go to Settings
2. Click "Export Data"
3. Download your backup JSON file

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds
- **Two-Factor Authentication**: TOTP-based 2FA
- **Role-Based Access Control**: Granular permissions
- **Input Validation**: Express-validator for request validation
- **CORS Protection**: Configured CORS policies

## Contributing

This is an open-source project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Future Enhancements

- [ ] Push notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] Custom workflows
- [ ] Integration with more third-party services
- [ ] Plugin system for extensibility
- [ ] Advanced recurring task patterns
- [ ] Task templates
- [ ] Time tracking
- [ ] Gantt charts

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

Inspired by Vikunja and other modern task management applications.
