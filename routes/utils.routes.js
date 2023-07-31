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
router.post("/wallet/flw-webhook", utils.handleFlwCallback);
router.get("/banks/all", utils.getAllBanksMonnifyController);
router.post("/contact-us", utils.postContactUsController);

// transactions
router.get("/transactions/all", utils.getAllTransactionsController);
router.get("/transactions/one", utils.getOneTransactionController);

// Crowd Funding
router.post("/link/pay", utils.postCrowdFundingController)
router.post("/link/create", authenticate, utils.postCreateCrowdFundingLink)
router.get("/link/transactions/:linkId", authenticate, utils.getCrowdFundedTransactionsPaidViaLink)

module.exports = router;
