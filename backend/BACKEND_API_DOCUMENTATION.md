# Projex Backend API Documentation

> Complete API reference for frontend development

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
  - [Auth Routes](#auth-routes)
  - [Users Routes](#users-routes)
  - [Tasks Routes](#tasks-routes)
  - [Projects Routes](#projects-routes)
  - [Lists Routes](#lists-routes)
  - [Labels Routes](#labels-routes)
  - [Comments Routes](#comments-routes)
  - [Backup Routes](#backup-routes)
  - [Google Calendar Routes](#google-calendar-routes)
- [Error Handling](#error-handling)
- [Role-Based Access Control](#role-based-access-control)

---

## Overview

**Base URL:** `http://localhost:5000/api`

**Tech Stack:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- Speakeasy for 2FA (TOTP)
- Nodemailer for email reminders
- Google Calendar API integration

**Health Check Endpoint:**
```
GET /api/health
Response: { "status": "OK", "message": "Projex API is running" }
```

---

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

The token expires after **7 days** by default.

---

## Data Models

### User

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `username` | String | Unique, 3-30 characters |
| `email` | String | Unique, lowercase |
| `firstName` | String | Optional |
| `lastName` | String | Optional |
| `avatar` | String | Avatar URL (null by default) |
| `role` | String | `'user'` or `'admin'` (default: `'user'`) |
| `twoFactorEnabled` | Boolean | Whether 2FA is enabled |
| `theme` | String | `'light'` or `'dark'` (default: `'light'`) |
| `googleCalendarAccessToken` | String | Google Calendar OAuth token |
| `googleCalendarRefreshToken` | String | Google Calendar refresh token |
| `preferences.emailNotifications` | Boolean | Email notifications enabled (default: `true`) |
| `preferences.pushNotifications` | Boolean | Push notifications enabled (default: `true`) |
| `preferences.defaultReminderTime` | Number | Hours before deadline (default: `24`) |
| `createdAt` | Date | Account creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

### Project

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `name` | String | Required, project name |
| `description` | String | Optional description |
| `owner` | ObjectId (User) | Project owner reference |
| `members` | Array | List of members with roles |
| `members[].user` | ObjectId (User) | Member reference |
| `members[].role` | String | `'viewer'`, `'editor'`, or `'admin'` |
| `members[].addedAt` | Date | When member was added |
| `color` | String | Hex color (default: `'#6366F1'`) |
| `isArchived` | Boolean | Archive status (default: `false`) |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

### List

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `name` | String | Required, list name |
| `description` | String | Optional description |
| `owner` | ObjectId (User) | List owner reference |
| `project` | ObjectId (Project) | Optional project reference |
| `members` | Array | List of members with roles |
| `members[].user` | ObjectId (User) | Member reference |
| `members[].role` | String | `'viewer'`, `'editor'`, or `'admin'` |
| `color` | String | Hex color (default: `'#8B5CF6'`) |
| `position` | Number | Order position (default: `0`) |
| `isArchived` | Boolean | Archive status (default: `false`) |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

### Task

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `title` | String | Required, task title |
| `description` | String | Optional description |
| `list` | ObjectId (List) | **Required**, parent list reference |
| `project` | ObjectId (Project) | Optional project reference |
| `createdBy` | ObjectId (User) | Task creator reference |
| `assignedTo` | Array[ObjectId] (User) | Assigned users |
| `priority` | String | `'low'`, `'medium'`, or `'high'` (default: `'medium'`) |
| `labels` | Array[ObjectId] (Label) | Attached labels |
| `dueDate` | Date | Optional deadline |
| `reminders` | Array | Reminder configurations |
| `reminders[].type` | String | `'email'` or `'push'` |
| `reminders[].timeBefore` | Number | Hours before deadline |
| `reminders[].sent` | Boolean | Whether reminder was sent |
| `reminders[].sentAt` | Date | When reminder was sent |
| `completed` | Boolean | Completion status (default: `false`) |
| `completedAt` | Date | Completion timestamp |
| `subtasks` | Array | Embedded subtasks |
| `subtasks[].title` | String | Required subtask title |
| `subtasks[].description` | String | Optional description |
| `subtasks[].completed` | Boolean | Completion status |
| `subtasks[].completedAt` | Date | Completion timestamp |
| `subtasks[].position` | Number | Order position |
| `position` | Number | Order position (default: `0`) |
| `isRecurring` | Boolean | Recurring task flag (default: `false`) |
| `recurringPattern.type` | String | `'daily'`, `'weekly'`, `'monthly'`, `'yearly'`, `'custom'` |
| `recurringPattern.interval` | Number | Interval (e.g., every 2 weeks) |
| `recurringPattern.daysOfWeek` | Array[Number] | 0-6 (Sunday-Saturday) |
| `recurringPattern.dayOfMonth` | Number | 1-31 |
| `recurringPattern.endDate` | Date | End date for recurrence |
| `recurringPattern.nextDueDate` | Date | Next scheduled due date |
| `parentTask` | ObjectId (Task) | Parent task for subtasks |
| `attachments` | Array | File attachments |
| `attachments[].filename` | String | File name |
| `attachments[].path` | String | File path |
| `attachments[].uploadedAt` | Date | Upload timestamp |
| `googleCalendarEventId` | String | Synced Google Calendar event ID |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

### Label

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `name` | String | Required, unique per user |
| `color` | String | Hex color (default: `'#3B82F6'`) |
| `createdBy` | ObjectId (User) | Owner reference |
| `createdAt` | Date | Creation timestamp |

---

### Comment

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `task` | ObjectId (Task) | Required, task reference |
| `user` | ObjectId (User) | Required, author reference |
| `content` | String | Required, comment text |
| `attachments` | Array | File attachments |
| `editedAt` | Date | Last edit timestamp |
| `createdAt` | Date | Creation timestamp |

---

## API Endpoints

### Auth Routes

Base: `/api/auth`

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "username": "string (3-30 chars, required)",
  "email": "string (valid email, required)",
  "password": "string (min 6 chars, required)",
  "firstName": "string (optional)",
  "lastName": "string (optional)"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email",
    "firstName": "firstName",
    "lastName": "lastName",
    "theme": "light"
  }
}
```

---

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "twoFactorToken": "string (required if 2FA enabled)"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email",
    "firstName": "firstName",
    "lastName": "lastName",
    "theme": "light",
    "twoFactorEnabled": false
  }
}
```

**Response when 2FA required (401):**
```json
{
  "message": "Two-factor authentication required",
  "requires2FA": true
}
```

---

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):** Full user object (excluding password and 2FA secret)

---

#### Enable 2FA
```http
POST /api/auth/enable-2fa
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "2FA setup initiated",
  "secret": "base32_secret",
  "qrCode": "data:image/png;base64,...",
  "manualEntryKey": "base32_secret"
}
```

---

#### Verify 2FA
```http
POST /api/auth/verify-2fa
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "token": "string (6 digits)"
}
```

**Response (200):**
```json
{
  "message": "2FA enabled successfully"
}
```

---

#### Disable 2FA
```http
POST /api/auth/disable-2fa
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "message": "2FA disabled successfully"
}
```

---

### Users Routes

Base: `/api/users`

#### Search Users
```http
GET /api/users/search?q=<query>
Authorization: Bearer <token>
```

**Query Parameters:**
- `q` - Search query (min 2 characters)

**Response (200):** Array of matching users (excludes current user)
```json
[
  {
    "_id": "user_id",
    "username": "username",
    "email": "email",
    "firstName": "firstName",
    "lastName": "lastName",
    "avatar": "avatar_url"
  }
]
```

---

#### Get User Profile
```http
GET /api/users/:id
Authorization: Bearer <token>
```

**Response (200):** User object (excluding password and 2FA secret)

---

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "theme": "'light' | 'dark' (optional)",
  "preferences": {
    "emailNotifications": "boolean (optional)",
    "pushNotifications": "boolean (optional)",
    "defaultReminderTime": "number (optional)"
  }
}
```

**Response (200):** Updated user object

---

### Tasks Routes

Base: `/api/tasks`

#### Get All Tasks (with filtering)
```http
GET /api/tasks
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `listId` | ObjectId | Filter by list |
| `projectId` | ObjectId | Filter by project |
| `assignedTo` | ObjectId or `'me'` | Filter by assigned user |
| `priority` | String | `'low'`, `'medium'`, `'high'` |
| `label` | ObjectId | Filter by label |
| `dueDate` | Date | Filter by due date |
| `completed` | Boolean | Filter by completion status |
| `search` | String | Search in title/description |
| `sortBy` | String | Field to sort by (default: `'createdAt'`) |
| `sortOrder` | String | `'asc'` or `'desc'` (default: `'desc'`) |
| `page` | Number | Page number (default: `1`) |
| `limit` | Number | Items per page (default: `50`) |

**Response (200):**
```json
{
  "tasks": [/* array of populated task objects */],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

---

#### Get Single Task
```http
GET /api/tasks/:id
Authorization: Bearer <token>
```

**Response (200):** Populated task object with list, project, creator, assignees, labels, and parent task

---

#### Create Task
```http
POST /api/tasks
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "list": "ObjectId (required)",
  "project": "ObjectId (optional)",
  "assignedTo": ["ObjectId array (optional)"],
  "priority": "'low' | 'medium' | 'high' (default: 'medium')",
  "labels": ["ObjectId array (optional)"],
  "dueDate": "Date (optional)",
  "reminders": [
    {
      "type": "'email' | 'push'",
      "timeBefore": "number (hours)"
    }
  ],
  "subtasks": [
    {
      "title": "string",
      "description": "string (optional)"
    }
  ],
  "isRecurring": "boolean (optional)",
  "recurringPattern": {
    "type": "'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'",
    "interval": "number",
    "daysOfWeek": "[0-6]",
    "dayOfMonth": "1-31",
    "endDate": "Date"
  }
}
```

**Response (201):** Created task object (populated)

---

#### Update Task
```http
PUT /api/tasks/:id
Authorization: Bearer <token>
```

**Request Body:** Any task fields to update

**Response (200):** Updated task object (populated)

---

#### Delete Task
```http
DELETE /api/tasks/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Task deleted successfully"
}
```

---

#### Toggle Task Completion
```http
PATCH /api/tasks/:id/complete
Authorization: Bearer <token>
```

**Response (200):** Updated task object

---

#### Add Subtask
```http
POST /api/tasks/:id/subtasks
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)"
}
```

**Response (200):** Updated task object with new subtask

---

### Projects Routes

Base: `/api/projects`

#### Get All Projects
```http
GET /api/projects
Authorization: Bearer <token>
```

**Response (200):** Array of projects (owned or member, non-archived)

---

#### Get Single Project
```http
GET /api/projects/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "project_id",
  "name": "Project Name",
  "description": "Description",
  "owner": { /* populated user */ },
  "members": [{ "user": { /* populated */ }, "role": "editor" }],
  "color": "#6366F1",
  "stats": {
    "tasks": 10,
    "completedTasks": 5,
    "lists": 3
  }
}
```

---

#### Create Project
```http
POST /api/projects
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "color": "hex color (optional, default: '#6366F1')"
}
```

**Response (201):** Created project object

---

#### Update Project
```http
PUT /api/projects/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "color": "hex color (optional)"
}
```

**Response (200):** Updated project object

---

#### Delete Project
```http
DELETE /api/projects/:id
Authorization: Bearer <token>
```

> Only project owner can delete

**Response (200):**
```json
{
  "message": "Project deleted successfully"
}
```

---

#### Add Project Member
```http
POST /api/projects/:id/members
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "ObjectId (required)",
  "role": "'viewer' | 'editor' | 'admin' (required)"
}
```

**Response (200):** Updated project object

---

#### Remove Project Member
```http
DELETE /api/projects/:id/members/:memberId
Authorization: Bearer <token>
```

**Response (200):** Updated project object

---

### Lists Routes

Base: `/api/lists`

#### Get All Lists
```http
GET /api/lists?projectId=<optional>
Authorization: Bearer <token>
```

**Query Parameters:**
- `projectId` - Filter by project (optional)

**Response (200):** Array of lists (owned or member, non-archived)

---

#### Get Single List
```http
GET /api/lists/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "list_id",
  "name": "List Name",
  "description": "Description",
  "owner": { /* populated user */ },
  "project": { /* populated project */ },
  "members": [{ "user": { /* populated */ }, "role": "editor" }],
  "color": "#8B5CF6",
  "stats": {
    "tasks": 15,
    "completedTasks": 8
  }
}
```

---

#### Create List
```http
POST /api/lists
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "project": "ObjectId (optional)",
  "color": "hex color (optional, default: '#8B5CF6')"
}
```

**Response (201):** Created list object

---

#### Update List
```http
PUT /api/lists/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "color": "hex color (optional)",
  "position": "number (optional)"
}
```

**Response (200):** Updated list object

---

#### Delete List
```http
DELETE /api/lists/:id
Authorization: Bearer <token>
```

> Only list owner or admin can delete

**Response (200):**
```json
{
  "message": "List deleted successfully"
}
```

---

#### Add List Member
```http
POST /api/lists/:id/members
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "ObjectId (required)",
  "role": "'viewer' | 'editor' | 'admin' (required)"
}
```

**Response (200):** Updated list object

---

### Labels Routes

Base: `/api/labels`

#### Get All Labels
```http
GET /api/labels
Authorization: Bearer <token>
```

**Response (200):** Array of labels (sorted by name)

---

#### Create Label
```http
POST /api/labels
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (required, unique per user)",
  "color": "hex color (optional, default: '#3B82F6')"
}
```

**Response (201):** Created label object

---

#### Update Label
```http
PUT /api/labels/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "color": "hex color (optional)"
}
```

**Response (200):** Updated label object

---

#### Delete Label
```http
DELETE /api/labels/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Label deleted successfully"
}
```

---

### Comments Routes

Base: `/api/comments`

#### Get Task Comments
```http
GET /api/comments/task/:taskId
Authorization: Bearer <token>
```

**Response (200):** Array of comments (sorted by createdAt descending)

---

#### Create Comment
```http
POST /api/comments
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "task": "ObjectId (required)",
  "content": "string (required)"
}
```

**Response (201):** Created comment object (populated)

---

#### Update Comment
```http
PUT /api/comments/:id
Authorization: Bearer <token>
```

> Only comment author can update

**Request Body:**
```json
{
  "content": "string (required)"
}
```

**Response (200):** Updated comment object (sets `editedAt` timestamp)

---

#### Delete Comment
```http
DELETE /api/comments/:id
Authorization: Bearer <token>
```

> Only comment author can delete

**Response (200):**
```json
{
  "message": "Comment deleted successfully"
}
```

---

### Backup Routes

Base: `/api/backup`

#### Export User Data
```http
GET /api/backup/export
Authorization: Bearer <token>
```

**Response:** JSON file download containing:
```json
{
  "version": "1.0",
  "exportedAt": "ISO date",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email"
  },
  "data": {
    "tasks": [/* all tasks */],
    "projects": [/* all projects */],
    "lists": [/* all lists */],
    "labels": [/* all labels */],
    "comments": [/* all comments */]
  }
}
```

---

#### Import User Data
```http
POST /api/backup/import
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "data": {
    "tasks": [/* tasks array */],
    "projects": [/* projects array */],
    "lists": [/* lists array */],
    "labels": [/* labels array */]
  }
}
```

**Response (200):**
```json
{
  "message": "Backup imported successfully"
}
```

---

### Google Calendar Routes

Base: `/api/google-calendar`

#### Get Authorization URL
```http
GET /api/google-calendar/auth
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/..."
}
```

---

#### OAuth Callback
```http
GET /api/google-calendar/callback?code=<auth_code>
Authorization: Bearer <token>
```

**Response:** Redirects to frontend with `?calendar=connected` or `?calendar=error`

---

#### Sync Task to Calendar
```http
POST /api/google-calendar/sync-task/:taskId
Authorization: Bearer <token>
```

> Task must have a due date

**Response (200):**
```json
{
  "message": "Task synced to Google Calendar",
  "eventId": "google_event_id"
}
```

---

#### Remove Task from Calendar
```http
DELETE /api/google-calendar/unsync-task/:taskId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Task removed from Google Calendar"
}
```

---

#### Disconnect Google Calendar
```http
DELETE /api/google-calendar/disconnect
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Google Calendar disconnected"
}
```

---

## Error Handling

All errors return a consistent format:

```json
{
  "message": "Error description",
  "error": "Detailed error (development only)",
  "errors": [/* Validation errors array (if applicable) */]
}
```

**Common HTTP Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

**Validation Error Format:**
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Error message",
      "path": "field_name",
      "location": "body"
    }
  ]
}
```

---

## Role-Based Access Control

### User Roles (Global)
- **user**: Standard user (default)
- **admin**: System administrator

### Project/List Member Roles
- **viewer**: Read-only access
- **editor**: Can create/edit/delete tasks
- **admin**: Full access including member management

### Access Rules

| Action | Required Role |
|--------|---------------|
| View project/list | viewer, editor, admin, or owner |
| Create/edit tasks | editor, admin, or owner |
| Delete project | Owner only |
| Delete list | Owner or admin |
| Manage members | editor, admin, or owner |
| Delete own comments | Comment author |
| Update own profile | Authenticated user |

---

## Background Services

### Reminder Service
- Runs every hour (cron: `0 * * * *`)
- Checks for tasks with upcoming due dates
- Sends email reminders based on `reminders[].timeBefore` configuration
- Respects user notification preferences

### Google Calendar Sync
- One-way sync from Projex to Google Calendar
- Creates 1-hour calendar events for tasks with due dates
- Stores `googleCalendarEventId` for update/delete operations

---

## Frontend Integration Tips

### Store the JWT Token
```javascript
// After login/register, store the token
localStorage.setItem('token', response.token);

// Add to all API requests
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
};
```

### Handle 2FA Flow
```javascript
// 1. Submit login
// 2. If response.requires2FA === true, show 2FA input
// 3. Resubmit login with twoFactorToken
```

### Implement Real-time Updates
Consider using:
- Polling for task lists
- WebSockets for real-time collaboration (not implemented in backend yet)

### Color Defaults
- Projects: `#6366F1` (indigo)
- Lists: `#8B5CF6` (purple)
- Labels: `#3B82F6` (blue)

### Priority Values
- `low`
- `medium` (default)
- `high`

### Theme Values
- `light` (default)
- `dark`
