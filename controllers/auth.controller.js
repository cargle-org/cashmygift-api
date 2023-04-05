// Dependencies
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

// Models
const User = require("../models/user.model");

// Middlewares
const {
    registerValidation,
    loginValidation,
} = require("../middlewares/validate");
const { uploadImageSingle } = require("../middlewares/cloudinary.js");
const asyncHandler = require("../middlewares/asyncHandler");

// Services
const sendMail = require("../services/mailer.services");

// Templates
const emailVerifyMail = require("../templates/emailVerifyMail.templates");
const resetPasswordMail = require("../templates/resetPasswordMail.templates");

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
    postRegisterController: asyncHandler(async(req, res, next) => {
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

        const body = await {...req.body, companyLogo: req.file };

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

        const alphabets = [
            "a",
            "b",
            "c",
            "d",
            "e",
            "f",
            "g",
            "h",
            "i",
            "j",
            "k",
            "l",
            "m",
            "n",
            "o",
            "p",
            "q",
            "r",
            "s",
            "t",
            "u",
            "v",
            "w",
            "x",
            "y",
            "z",
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J",
            "K",
            "L",
            "M",
            "N",
            "O",
            "P",
            "Q",
            "R",
            "S",
            "T",
            "U",
            "V",
            "W",
            "X",
            "Y",
            "Z",
        ];

        const rand = Math.floor(Math.random() * 48);
        const rand2 = Math.floor(Math.random() * 48);
        const rand3 = Math.floor(Math.random() * 48);
        const rand4 = Math.floor(Math.random() * 48);

        const time = moment().format("yy-MM-DD hh:mm:ss");
        const ref = time.replace(/[\-]|[\s]|[\:]/g, "");

        emailVerificationToken = `${alphabets[rand]}${alphabets[rand3]}${alphabets[rand2]}_${ref}${rand4}`;

        // create user
        const user = new User({
            firstName,
            lastName,
            email,
            emailVerificationToken,
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

        // Send email
        const mailOptions = {
            to: user.email,
            subject: "Email verification mail",
            html: emailVerifyMail(user._id, user.firstName, emailVerificationToken),
        };

        sendMail(mailOptions);

        return res.status(200).send({
            success: true,
            data: {
                user: user,
            },
            message: "User Registered successfully.",
        });
    }),

    // verify email
    getVerifyEmailController: asyncHandler(async(req, res, next) => {
        const { id, emailToken } = req.query;

        //   check if user exist
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(400).send({
                success: false,
                message: "User not found",
            });
        }

        // verify token
        if (user.emailVerificationToken === emailToken) {
            user.emailVerificationToken = "verified";
            user.verifiedEmail = true;
            await user.save();

            return res.status(200).send({
                success: true,
                data: {
                    user: user,
                },
                message: "Email verification successful.",
            });
        } else {
            return res.status(400).send({
                success: false,
                message: "Email Verification failed",
            });
        }
    }),

    // Login
    postLoginController: asyncHandler(async(req, res, next) => {
        const { email, password } = req.body;

        // Run Hapi/Joi validation
        const { error } = await loginValidation.validateAsync(req.body);
        if (error) {
            return res.status(400).send({
                success: false,
                message: error.details[0].message,
            });
        }

        //   check if user exist
        const user = await User.findOne({ email: email });
        console.log(
            "🚀 ~ file: auth.controller.js:225 ~ postLoginController:asyncHandler ~ user:",
            user
        );
        if (!user) {
            return res.status(400).send({
                success: false,
                message: "Invalid email or password.",
            });
        }
        // check if email is verified
        if (!user.verifiedEmail) {
            return res.status(400).send({
                success: false,
                message: "Email not verified",
            });
        }

        // validate password
        const validatePassword = await bcrypt.compare(password, user.password);
        if (!validatePassword) {
            return res.status(400).send({
                success: false,
                message: "Invalid email or password.",
            });
        }

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

    // Forgot password
    postForgotPasswordController: async(req, res, next) => {
        try {
            const { email } = req.body;

            //   check if user exist
            const user = await User.findOne({ email: email });
            if (!user) {
                return res.status(400).send({
                    success: false,
                    message: "This email is not linked to an account",
                });
            }

            const resetToken = uuidv4();
            const expire = moment().add(15, "minutes").format("YYYY-MM-DD hh:mm:ss");

            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = expire;

            await user.save();

            // Send email
            const mailOptions = {
                to: user.email,
                subject: "Password Reset Mail",
                html: resetPasswordMail(user._id, user.firstName, resetToken),
            };

            sendMail(mailOptions);

            return res.status(200).send({
                success: true,
                message: "Please refer to your mail to complete this process",
            });
        } catch (error) {
            console.log(
                "🚀 ~ file: auth.controller.js:269 ~ postForgotPasswordCotroller: ~ error:",
                error
            );
            return res.status(400).send({
                success: false,
                message: "Forgot password error",
                errMessage: error,
            });
        }
    },

    // Reset password
    postResetPasswordController: async(req, res, next) => {
        try {
            const { newPassword, confirmPassword } = req.body;

            const { resetToken } = req.query;

            //   check if user exist
            const user = await User.findOne({ resetToken: resetToken });
            if (!user) {
                return res.status(400).send({
                    success: false,
                    message: "User not found",
                });
            }

            // Check if password matches
            if (newPassword !== confirmPassword) {
                return res.status(400).send({
                    success: false,
                    message: "Password does not match",
                });
            }

            // initiate time to check if token is still valid
            const t = moment().format("YYYY-MM-DD hh:mm:ss");
            const time = new Date(t).getTime();

            if (time > new Date(user.resetPasswordExpires).getTime()) {
                return res.status(400).send({
                    success: false,
                    message: "Oops, link has expired",
                });
            }

            user.password = newPassword;
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;

            await user.save();

            return res.status(200).send({
                success: true,
                data: {
                    user: user,
                },
                message: "Password reset was successful.",
            });
        } catch (error) {
            console.log(
                "🚀 ~ file: auth.controller.js:364 ~ postResetPasswordController:async ~ error:",
                error
            );
            return res.status(400).send({
                success: false,
                message: "Reset password error",
                errMessage: error.message,
            });
        }
    },

    // Change password
    postChangePasswordController: async(req, res, next) => {
        try {
            const { newPassword, confirmPassword } = req.body;

            const { userId } = req.query;

            //   check if user exist
            const user = await User.findOne({ _id: userId });
            if (!user) {
                return res.status(400).send({
                    success: false,
                    message: "User not found",
                });
            }

            // Check if password matches
            if (newPassword !== confirmPassword) {
                return res.status(400).send({
                    success: false,
                    message: "Password does not match",
                });
            }

            user.password = newPassword;

            await user.save();

            return res.status(200).send({
                success: true,
                data: {
                    user: user,
                },
                message: "Password was changed successfully.",
            });
        } catch (error) {
            console.log(
                "🚀 ~ file: auth.controller.js:412 ~ postChangePasswordController:async ~ error:",
                error
            );
            return res.status(400).send({
                success: false,
                message: "Change password error",
                errMessage: error.message,
            });
        }
    },
};