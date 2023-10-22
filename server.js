// Import dependencies
const path = require("path");
const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
// const helmet = require("helmet");
const xss = require("xss-clean");
// const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const errorHandler = require("./middlewares/error");

// ENV Variables
const port = process.env.PORT;
// const MONGODB_URI = process.env.MDB_COMPASS;
const MONGODB_URI = process.env.MDB_ATLAS;

// Don't ask
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
// Sanitize data
app.use(mongoSanitize());

//Set security headers
// app.use(helmet());

//Prevent XSS attacks
app.use(xss());

//Rate limiting
// const limiter = rateLimit({
//   windows: 10 * 60 * 1000, //10 min
//   max: 100,
// });

// app.use(limiter);

// Prevent http param pollution
app.use(hpp());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Set Routes
require("./routes/index.routes")(app);
app.use(errorHandler);

// Connect to DB and start server
mongoose
  .connect(MONGODB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("***Database Connected***");
    app.listen(port, () => {
      console.log(`<<<Server running on ${port}>>>`);
    });
  })
  .catch((err) => console.log("Connection Error: ", err.message));

  //Handle Unhandled Rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  server.close(() => process.exit(1));
});