// Dependencies
// const { Router } = require("express");
const express = require("express");
const path = require("path");

// Middlewares
const { multerUploads } = require("../middlewares/multer");

// controller
const auth = require("../controllers/auth.controller");

// Stuff
const router = express.Router();

// Routes
router.get("/ping", auth.getPingController);
router.post(
    "/register",
    multerUploads.single("companyLogo"),
    auth.postRegisterController
);
router.get("/verify", auth.getVerifyEmailController);
router.post("/login", auth.postLoginController);
router.post("/forgot-password", auth.postForgotPasswordController);
router.post("/reset-password", auth.postResetPasswordController);
router.post("/change-password", auth.postChangePasswordController);

module.exports = router;