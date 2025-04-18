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
    { name: "logo", maxCount: 1 }, // Assuming logo field can only a single
    { name: "recipients", maxCount: 1 }, // Assuming recipients field is a single file
  ]),
  utils.postCreateVoucherController
);
router.post(
  "/guest/voucher/create",
  // multerUploads.single("thumbnail"),
  multerUploads.fields([
    { name: "logo", maxCount: 1 }, // Assuming logo field can only a single
    { name: "recipients", maxCount: 1 }, // Assuming recipients field is a single file
  ]),
  utils.postCreateGuestVoucherController
);
router.put(
  "/voucher/update",
  authenticate,
  multerUploads.fields([
    { name: "recipients", maxCount: 1 }, // Assuming recipients field is a single file
  ]),
  utils.putUpdateVoucherController
);
router.put(
  "/guest/voucher/update/:voucherId",
  multerUploads.fields([
    { name: "recipients", maxCount: 1 }, // Assuming recipients field is a single file
  ]),
  utils.putUpdateGuestVoucherController
);
router.post("/voucher/one", utils.postFindVoucherController);
router.get("/guest/voucher/one/:voucherId", utils.getFindGuestVoucherController);
router.get("/guest/transaction/:transactionId", utils.getFindGuestTransactionController);
router.post("/voucher/save-draft", utils.postCreateVoucherDraftController);
router.get("/voucher/find-draft/:draftId", utils.getOneVoucherDraftController);
router.get("/voucher/all-drafts", utils.getAllVoucherDraftsController);
router.post("/voucher/claim", utils.postCashoutVoucherController);
router.post("/wallet/fund", authenticate, utils.postFundWalletController);
router.post("/guest/fund/:voucherId", utils.postGuestFundWalletController);
router.post("/wallet/verify-wallet-fund", utils.verifyWalletFundWebhook);
router.get("/wallet/verify-wallet-fund", utils.verifyWalletFundWebhook); // for webhook
router.get("/guest/verify-fund", utils.getVerifyGuestFundController);
router.get("/wallet/verifyTrx", authenticate, utils.getVerifyController);
router.post(
  "/wallet/withdraw",
  authenticate,
  utils.postWithdrawFromWalletController
);
router.post("/wallet/flw-webhook", utils.handleFlwCallback);
router.get("/banks/all", utils.getAllBanksMonnifyController);
router.get("/bank/one", utils.getOneBankMonnifyController);
router.post("/contact-us", utils.postContactUsController);
router.post("/webhook", utils.webhook);
router.post("/transfer/webhook", utils.transferWebhook);

// airtime routes
router.get("/airtime-billers", utils.getAllAirtimeBillersController);
router.get("/bill-information", utils.getBillInformationController);
router.post(
  "/voucher/claim-as-airtime",
  utils.postCashVoucherAsAirtimeController
);

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
router.get("/links/one", utils.getPaymentLinkById);
router.delete("/links/delete", utils.deletePaymentLinkById);

// Homepage Stats
router.get("/homepage-stats", utils.getHomepageStats);

router.get("/get-ip", utils.getIPAddress);

module.exports = router;
