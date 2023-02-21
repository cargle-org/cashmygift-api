// Dependencies
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");

const authenticate = async (req, res, next) => {
  const token = req.header("x-access-token");
  if (!token)
    return res.status(401).send({
      success: false,
      message: "Access denied",
    });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    //   check if user exist
    const user = await userModel.findOne({ _id: verified._id });
    if (!user) {
      return res.status(400).send("User not found");
    }
    req.user = user;

    next();
  } catch (err) {
    res.status(400).send({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  authenticate,
};
