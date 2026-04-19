const express = require("express");

// const userRoute = require("./src/modules/user_model/user_route");
const app = express();
const path = require("path");
const connection = require("./src/db/connection");
const { google } = require("googleapis");
const port = process.env.PORT || 3000;
const cors = require("cors");
const managerRoute = require("./src/routes/managerRoutes/m");
const itStaffRouteForAccontControl = require("./src/routes/it_deparment/Account_control");
const itStaffRouteForAccessInMedicalRecorsViewing = require("./src/routes/it_deparment/access");
const module1 = require("./src/routes/patientManagemant/module1");
const module2 = require("./src/routes/patientManagemant/module2");
const module3 = require("./src/routes/patientManagemant/module3");
const module4 = require("./src/routes/patientManagemant/module4");
const module5 = require("./src/routes/patientManagemant/module5");
const staffAccounts = require("./src/routes/it_deparment/staff.routes");
const morgan = require("morgan");
// const { createManager } = require("./src/db/admin.setup");

const allowedOrigins = [
   "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "https://medsynck.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  }),
);

app.use(express.json());
connection();
// createManager()
app.use(morgan("dev"));

// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", managerRoute);
app.use("/api/accountControl", itStaffRouteForAccontControl);
app.use("/api/accountStaff", staffAccounts);
app.use("/api/medRecordsView", itStaffRouteForAccessInMedicalRecorsViewing);
app.use("/api/module1", module1);
app.use("/api/module2", module2);
app.use("/api/module3", module3);
app.use("/api/module4", module4);
app.use("/api/module5", module5);

// Load from .env or hardcode for testing
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:4444/api/oauth2callback", // must match what you set in Google Cloud
);

// Important: set the refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Step 1: Start OAuth flow
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.send"],
  });
  res.redirect(url);
});

// Step 2: Handle callback
app.get("/api/oauth2callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // For now just show tokens (in real app, store securely in DB or env)
    res.json(tokens);
  } catch (err) {
    console.error("Error exchanging code:", err);
    res.status(500).send("Authentication failed");
  }
});

app.get("/send-test", async (req, res) => {
  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const message = `
Hello E,

This is a test email sent via Gmail API + OAuth2.

If you’re reading this, the integration works!

Best,
Your Hospital IT System
    `;

    // Gmail requires base64url encoding
    const raw = Buffer.from(
      `To: ${process.env.MAIL_USER}\r\n` +
        `From: ${process.env.MAIL_USER}\r\n` +
        `Subject: Test Email from Hospital IT\r\n\r\n` +
        message,
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    res.status(200).send("Test email sent successfully!");
  } catch (err) {
    console.error("Error sending test email:", err);
    res.status(500).send("Failed to send test email");
  }
});

app.listen(port, () => {
  console.log(` server listening on port ${port}`);
});
