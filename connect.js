const mongose = require("mongoose");
const connectDB = (url) => {
  return mongose
    .connect(url)
    .then(() => console.log("Database connected"))
    .catch((err) => console.log(err));
};

module.exports = connectDB;
