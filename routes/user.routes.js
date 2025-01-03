// Dependencies
// const { Router } = require("express");
const express = require("express");
const path = require("path");

// Middlewares
const { authenticate } = require("../middlewares/authenticateJWT");
const { multerUploads } = require("../middlewares/multer");

// controller
const user = require("../controllers/user.controller");

// Stuff
const router = express.Router();

// Routes.
router.get("/ping", user.getPingController);
router.get("/one", authenticate, user.getUserController);
router.post(
  "/edit",
  multerUploads.single("companyLogo"),
  authenticate,
  user.postEditProfileController
);
router.get("/vouchers/all", authenticate, user.getAllUserVouchersController);
router.get("/vouchers/one", authenticate, user.getOneVouchersController);

module.exports = router;
