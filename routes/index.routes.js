// Import Routes
const authRouter = require("./auth.routes");
const userRouter = require("./user.routes");
const utilsRouter = require("./utils.routes");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.get('/hello', (req, res) => {
    res.send('Hello, World 2!');
  });
  app.use("/api/auth", authRouter);
  app.use("/api/user", userRouter);
  app.use("/api/utils", utilsRouter);
};
