const express = require("express");

// const userRoute = require("./src/modules/user_model/user_route");
const app = express();
// const path = require("path");
const connection = require("./src/db/connection");
const port = process.env.PORT || 3000;
const managerRoute = require("./src/routes/managerRoutes/m");
const morgan = require("morgan");

app.use(express.json());
connection();
app.use(morgan("dev"));


app.get("/", (req, res) => {
  res.send("Hello World!");
});
// app.use(express.static(path.join(__dirname, "public")));
app.use("/api", managerRoute);

app.listen(port, () => {
  console.log(` server listening on port ${port}`);
});
