// Dependencies
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Models
const User = require("../models/user.model");

// Middlewares
const {
  registerValidation,
  loginValidation,
} = require("../middlewares/validate");
const { uploadImageSingle } = require("../middlewares/cloudinary.js");
const asyncHandler = require("../middlewares/asyncHandler");

module.exports = {
  //   Test API connection
  getPingController: (req, res) => {
    try {
      return res.status(200).send({
        success: true,
        message: "Pong",
      });
    } catch (err) {
      return res.status(500).send({
        success: false,
        message: err.message,
      });
    }
  },

  //   SignUp
  postRegisterController: asyncHandler(async (req, res, next) => {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      companyName,
      companyEmail,
      companyPhone,
    } = req.body;

    const body = { ...req.body, companyLogo: req.file };

    // Run Hapi/Joi validation
    const { error } = await registerValidation.validateAsync(body);
    if (error) return res.status(400).send(error.details[0].message);

    //   check if email exist
    const emailExists = await User.findOne({ email: email });
    if (emailExists) {
      return res.status(400).send({
        success: false,
        message: "Email already exists.",
      });
    }

    // send image to Cloudinary
    const companyLogo = await uploadImageSingle(req, res, next);

    //   Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // create user
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      companyName,
      companyLogo,
      companyEmail,
      companyPhone,
    });
    await user.save();

    console.log(
      "🚀 ~ file: auth.controller.js:79 ~ postRegisterController:asyncHandler ~ user:",
      user
    );

    return res.status(200).send({
      success: true,
      data: {
        user: user,
      },
      message: "User Registered successfully.",
    });
  }),

  // Login
  postLoginController: asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Run Hapi/Joi validation
    const { error } = await loginValidation.validateAsync(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    //   check if user exist
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).send("Invalid email or password.");
    }

    // validate password
    const validatePassword = await bcrypt.compare(password, user.password);
    if (!validatePassword)
      return res.status(400).send("Invalid email or password.");

    //   Generate JWT Token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

    return res.status(200).send({
      success: true,
      data: {
        user: user,
        token: token,
      },
      message: "Login successful.",
    });
  }),
};
