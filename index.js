require('dotenv').config();
const express = require("express");
const morgan = require("morgan");
const router = require("./routes/route.js");
const mongoose = require("mongoose");
const multer = require("multer");
const app = express(); 

app.use(express.static('./public'));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(multer().any());

mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDb is connected 💯✅"))
  .catch((err) => console.log(err));

app.use("/", router);

const port = process.env.PORT || 3000;
app.listen(port, function () { 
  console.log("Express app running on port " +  port);
});
