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
  // multerUploads.single("thumbnail"),
  multerUploads.fields([
    { name: "thumbnail", maxCount: 10 }, // Assuming thumbnail field can have up to 10 files
    { name: "recipients", maxCount: 1 }, // Assuming recipients field is a single file
  ]),
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
router.post("/webhook", utils.webhook);
router.post("/transfer/webhook", utils.transferWebhook);

// transactions
router.get("/transactions/all", utils.getAllTransactionsController);
router.get("/transactions/one", utils.getOneTransactionController);

// Crowd Funding
router.post("/links/pay", utils.postCrowdFundingController);
router.post("/links/create", authenticate, utils.postCreateCrowdFundingLink);
router.get(
  "/links/transactions/:linkId",
  authenticate,
  utils.getCrowdFundedTransactionsPaidViaLink
);
router.get("/user/links", authenticate, utils.getUserLinks);
router.get("/links/categories", utils.getCategories);
router.get("/links/:linkId", utils.getLinkDetails);

module.exports = router;
