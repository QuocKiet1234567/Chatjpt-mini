const { google } = require("googleapis");
require("dotenv").config();

const auth = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

auth.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const calendar = google.calendar({ version: "v3", auth });

// CREATE EVENT
async function createEvent(task, time) {
  if (!time) return;

  const start = new Date(time);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: task,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });
}

module.exports = { createEvent };