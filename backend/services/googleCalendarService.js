const { google } = require('googleapis');

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Get authorization URL
const getAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
};

// Exchange code for tokens
const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

// Set user credentials
const setUserCredentials = (accessToken, refreshToken) => {
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });
};

// Create calendar event from task
const createCalendarEvent = async (task, user) => {
  try {
    // Set user's credentials
    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: task.dueDate ? new Date(task.dueDate).toISOString() : new Date().toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: task.dueDate 
          ? new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString()
          : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'UTC',
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

// Update calendar event
const updateCalendarEvent = async (eventId, task, user) => {
  try {
    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: task.dueDate ? new Date(task.dueDate).toISOString() : new Date().toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: task.dueDate 
          ? new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString()
          : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'UTC',
      },
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
    });

    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
};

// Delete calendar event
const deleteCalendarEvent = async (eventId, user) => {
  try {
    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};

module.exports = {
  getAuthUrl,
  getTokens,
  setUserCredentials,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
};
