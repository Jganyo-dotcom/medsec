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
const staffAccounts = require("./src/routes/it_deparment/staff.routes");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io"); // <-- capital S

const server = http.createServer(app);

// Create Socket.IO instance
const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins for dev
    methods: ["GET", "POST"],
  },
});
// const { createManager } = require("./src/db/admin.setup");

const allowedOrigins = [
  "https://verifymistvault.netlify.app",
  "https://mistvault.netlify.app",
  "https://medsyncmanager.netlify.app",
  "http://localhost:5174",
  "http://localhost:5173",
  "http://127.0.0.1:5501",
  "http://127.0.0.1:5502",
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
// createManager();
app.use(morgan("dev"));

//global variables acceesiible anywhere
const userSockets = {};
app.locals.io = io;
app.locals.userSockets = userSockets;
const jwt = require("jsonwebtoken");

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRETE);

      socket.userId = decoded.id; // attach userId to socket

      next();
    } else {
      console.log("no token");
      next();
    }
  } catch (err) {
    console.log("Couldn’t validate token");
  }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "for user:", socket.userId);

  if (socket.userId) {
    userSockets[socket.userId] = socket.id;
  }

  socket.on("disconnect", () => {
    delete userSockets[socket.userId];
    console.log("Socket disconnectedd:", socket.id);
  });
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/api", managerRoute);
app.use("/api/accountStaff/accountControl", itStaffRouteForAccontControl); // is in use
app.use("/api/accountStaff", staffAccounts); // is in  use

server.listen(port, () => {
  console.log(` server listening on port ${port}`);
});
