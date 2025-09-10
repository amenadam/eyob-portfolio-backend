const express = require("express");
require("dotenv").config();
const path = require("path");
const startBot = require("./bot/index");
const app = express();
const connectDB = require("./connect");
const cors = require("cors");
const router = require("./routes/projects");

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" })); // Increase limit for image data
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api", router);

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    startBot();
    app.listen(3000, () => console.log("Server started on port 3000"));
  } catch (error) {
    console.log(error);
  }
};
start();

