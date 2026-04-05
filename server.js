const express = require("express");

// const userRoute = require("./src/modules/user_model/user_route");
const app = express();
const path = require("path");
const connection = require("./src/db/connection");
const port = process.env.PORT || 3000;
const cors = require("cors");
const managerRoute = require("./src/routes/managerRoutes/m");
const itStaffRouteForAccontControl = require("./src/routes/it_deparment/Account_control");
const itStaffRouteForAccessInMedicalRecorsViewing = require("./src/routes/it_deparment/access");
const staffAccounts = require("./src/routes/it_deparment/staff.routes");
const morgan = require("morgan");

app.use(
  cors({
    origin: "http://127.0.0.1:5500", // allow your frontend origin
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  }),
);

app.use(express.json());
connection();
app.use(morgan("dev"));

// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", managerRoute);
app.use("/api/accountControl", itStaffRouteForAccontControl);
app.use("/api/accountStaff", staffAccounts);
app.use("/api/medRecordsView", itStaffRouteForAccessInMedicalRecorsViewing);

app.listen(port, () => {
  console.log(` server listening on port ${port}`);
});
