// Dependencies
const express = require("express");
const path = require("path");

// Middlewares
const { multerUploads } = require("../middlewares/multer");
const { authenticate } = require("../middlewares/authenticateJWT");

// controller
const utils = require("../controllers/utils.controller");

// Stuff
const router = express.Router();

// Routes
router.get("/ping", authenticate, utils.getPingController);
router.post(
    "/voucher/create",
    authenticate,
    multerUploads.single("thumbnail"),
    utils.postCreateVoucherController
);
router.post("/voucher/one", utils.postFindVoucherController);
router.post("/voucher/claim", utils.postCashoutVoucherController);
router.post("/wallet/fund", authenticate, utils.postFundWalletController);
router.get("/wallet/verifyTrx", authenticate, utils.getVerifyController);
router.post(
    "/wallet/withdraw",
    authenticate,
    utils.postWithdrawFromWalletController
);
router.get("/banks/all", utils.getAllBanksController);

module.exports = router;