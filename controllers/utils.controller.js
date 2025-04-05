// Dependecies
const moment = require("moment");
const axios = require("axios");
const xlsx = require("xlsx");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const Validator = require("../validators/validator.index");

// Flutterwave stuff
const Flutterwave = require("flutterwave-node-v3");
const baseURL = process.env.FLUTTERWAVE_BASE_URL;
// const FLW_pubKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
// const FLW_secKey = process.env.FLUTTERWAVE_SECRET_KEY;

// TEST Mode
const FLW_pubKey = process.env.FLUTTERWAVE_TEST_PUBLIC_KEY;
const FLW_secKey = process.env.FLUTTERWAVE_TEST_SECRET_KEY;
// Webhook
const FLW_SECRET_HASH = FLW_secKey; // For webhook

// Models
const voucherModel = require("../models/voucher.model");
const voucherDraftModel = require("../models/draft.model");
const transactionModel = require("../models/transaction.model");
const userModel = require("../models/user.model");
const winnerModel = require("../models/winner.model");
const contactModel = require("../models/contact.model");
const guestTransactionModel = require("../models/guestTransaction.model");
const guestVoucherModel = require("../models/guestVoucher.model");

// Middlewares
const {
  createVoucherValidation,
  cashoutVoucherValidation,
  cashoutVoucherAsAirtimeValidation,
  createVoucherDraftValidation,
} = require("../middlewares/validate");
const asyncHandler = require("../middlewares/asyncHandler");
const { uploadImageSingle, uploadLogo } = require("../middlewares/cloudinary");
const tx_ref = require("../middlewares/tx_ref");

// Services
const sendMail = require("../services/mailer.services");
const FLW_services = require("../services/flutterwave.services");
const monnify = require("../services/monnify.services");

// Templates
const voucherClaimMail = require("../templates/voucherClaimMail.templates");
const winnerVoucherClaimMail = require("../templates/winnerVoucherClaimMail.templates");
const newVoucherMail = require("../templates/newVoucherMail.templates");
const contactUsMail = require("../templates/contactUsMail.templates");
const linkModel = require("../models/link.model");
const ErrorResponse = require("../utils/errorResponse");
const { default: mongoose } = require("mongoose");

// /Date Format
const { fromZonedTime } = require("date-fns-tz");

//   Test API connection
const getPingController = (req, res) => {
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
};

// Fund wallet
const postFundWalletController = asyncHandler(async (req, res, next) => {
  try {
    const { amount, portal = "flutterwave" } = req.body;
    console.log("PORTAL*************", { portal });

    const currency = "NGN";
    const transREf = tx_ref.get_Tx_Ref();
    let chosenPortal;
    let paymentReference;
    let transactionReference;

    if (portal) {
      chosenPortal = portal;
    } else if (!portal) {
      chosenPortal = "flutterwave";
    }

    let response;
    if (chosenPortal === "flutterwave") {
      console.log("flutterwave");
      const FLW_payload = {
        tx_ref: transREf,
        amount,
        currency,
        payment_options: "card",
        // redirect_url: "https://usepays.up.railway.app/dashboard/transactions",
        // redirect_url: "https://www.usepays.co/dashboard/transactions",
        redirect_url: process.env.FLW_REDIRECT_URL,
        customer: {
          email: req.user.email,
          phonenumber: req.user.phone,
          name: req.user.name,
        },
        meta: {
          customer_id: req.user._id,
        },
        customizations: {
          title: "Pays",
          description: "Pay with card",
          logo: "#",
        },
      };
      response = await FLW_services.initiateTransaction(FLW_payload);
      paymentReference = transREf;
      transactionReference = transREf;
    }

    if (chosenPortal === "monnify") {
      console.log("MOnnify");
      const MNF_payload = {
        amount,
        name: req.user.name,
        email: req.user.email,
        id: req.user._id,
        description: "Funding Usepays wallet",
        tx_ref: transREf,
      };

      const token = await monnify.obtainAccessToken();
      const MNF_response = await monnify.initializePayment(MNF_payload, token);
      console.log({ MNF_response });
      paymentReference = MNF_response.paymentReference;
      transactionReference = MNF_response.transactionReference;
      response = MNF_response.checkoutUrl;
    }

    // paymentReference
    const transaction = await new transactionModel({
      tx_ref: transREf,
      paymentReference,
      transactionReference,
      userId: req.user._id,
      amount,
      currency,
      type: "credit",
      status: "initiated",
    });

    await transaction.save();

    return res.status(200).send({
      success: true,
      data: {
        response,
      },
      message: "Payment Initiated",
    });
  } catch (err) {
    console.log("🚀 ~ postFundWalletController ~ err:", err);
    return res.status(500).send({
      success: false,
      message: err.message,
    });
  }

  // //  Good ol' monnify
  // const { amount } = req.body;

  // const currency = "NGN";
  // const transREf = await tx_ref.get_Tx_Ref();
  // // const tx_ref = "" + Math.floor(Math.random() * 1000000000 + 1);

  // const payload = {
  //   amount,
  //   name: req.user.name,
  //   email: req.user.email,
  //   description: "Funding Usepays wallet",
  //   tx_ref: transREf,
  // };

  // const token = await monnify.obtainAccessToken();
  // const makePayment = await monnify.initializePayment(payload, token);

  // const transaction = await new transactionModel({
  //   tx_ref: transREf,
  //   paymentReference: makePayment.paymentReference,
  //   transactionReference: makePayment.transactionReference,
  //   userId: req.user._id,
  //   amount,
  //   currency,
  //   type: "credit",
  //   status: "initiated",
  // });

  // await transaction.save();

  // return res.status(200).send({
  //   success: true,
  //   data: makePayment.checkoutUrl,
  //   message: "Payment Initiated",
  // });
});

// Guest Fund wallet
const postGuestFundWalletController = asyncHandler(async (req, res, next) => {
  try {
    const { email, portal } = req.body;
    console.log("PORTAL*************", portal);

    const currency = "NGN";
    const transREf = tx_ref.get_Tx_Ref();
    let chosenPortal;
    let paymentReference;
    let transactionReference;

    const { voucherId } = req.params;
    const voucher = await guestVoucherModel.findOne({ _id: voucherId });

    if (!voucher) {
      return res.status(404).send({
        success: false,
        message: "This voucher does not exist, please try another.",
      });
    }

    if (portal) {
      chosenPortal = portal;
    } else if (!portal) {
      chosenPortal = "flutterwave";
    }

    let response;
    if (chosenPortal === "flutterwave") {
      console.log("flutterwave");
      const FLW_payload = {
        tx_ref: transREf,
        amount: voucher?.totalAmount,
        currency,
        payment_options: "card",
        // redirect_url: "https://usepays.up.railway.app/dashboard/transactions",
        // redirect_url: "https://www.usepays.co/dashboard/transactions",
        redirect_url: process.env.FLW_REDIRECT_URL,
        customer: {
          email: email,
          // phonenumber: req.user.phone,
          // name: req.user.name,
        },
        meta: {
          customer_id: voucher?._id,
        },
        customizations: {
          title: "Pays",
          description: "Pay with card",
          logo: "#",
        },
      };
      response = await FLW_services.initiateTransaction(FLW_payload);
      paymentReference = transREf;
      transactionReference = transREf;
    }

    if (chosenPortal === "monnify") {
      console.log("MOnnify");
      const MNF_payload = {
        amount: voucher?.totalAmount,
        // name: req.user.name,
        email,
        description: "Funding Usepays wallet",
        tx_ref: transREf,
      };

      const token = await monnify.obtainAccessToken();
      const MNF_response = await monnify.initializePayment(MNF_payload, token);
      console.log({ MNF_response });
      paymentReference = MNF_response.paymentReference;
      transactionReference = MNF_response.transactionReference;
      response = MNF_response.checkoutUrl;
    }

    const transaction = await guestTransactionModel.create({
      tx_ref: transREf,
      paymentReference,
      transactionReference,
      voucherId: voucher?._id, //pass voucher Id from valid voucher
      amount: voucher?.totalAmount,
      currency,
      email,
      type: "credit",
      status: "initiated",
    });

    await transaction.save();
    // console.log("trans1", transaction)

    //add the transactionId to the voucher
    if (voucher) {
      await guestVoucherModel.findByIdAndUpdate(
        voucher._id,
        {
          transactionId: transaction._id,
        },
        { new: true }
      );
      // console.log("trans2", updatedVoucher)
    }

    return res.status(200).send({
      success: true,
      data: {
        response,
      },
      message: "Payment Initiated",
    });
  } catch (err) {
    console.log("🚀 ~ postFundWalletController ~ err:", err);
    return res.status(500).send({
      success: false,
      message: err.message,
    });
  }
});

//get one Guest voucher
const getFindGuestVoucherController = asyncHandler(async (req, res, next) => {
  const { voucherId } = req.params;
  // console.log(
  //   "🚀 ~ getOneGuestVouchersController:asyncHandler ~ req.query:",
  //   req.query
  // );

  // check if Voucher exist
  const voucher = await guestVoucherModel.findOne({ _id: voucherId });

  if (!voucher) {
    return res.status(400).send({
      success: false,
      message: "voucher not found.",
    });
  }

  return res.status(200).send({
    success: true,
    data: {
      voucher: voucher,
    },
    message: "Voucher fetched successfully.",
  });
});

//get one Guest transaction
const getFindGuestTransactionController = asyncHandler(
  async (req, res, next) => {
    const { transactionId } = req.params;

    // check if Transaction exist
    const transaction = await guestTransactionModel.findOne({
      _id: transactionId,
    });

    if (!transaction) {
      return res.status(400).send({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).send({
      success: true,
      data: {
        transaction: transaction,
      },
      message: "Transaction fetched successfully.",
    });
  }
);

// Verify "Fund wallet transaction"
const getVerifyController = asyncHandler(async (req, res, next) => {
  const id = req.query.transaction_id;
  const tx_ref = req.query.tx_ref;
  const status = req.query.status;
  const paymentReference = req.query.paymentReference;
  console.log("🚀 ~ getVerifyController ~ req.query:", req.query);
  console.log({ paymentReference, id, tx_ref });
  console.log(!tx_ref && !id);
  console.log(tx_ref === "null" && id === "null");

  let transaction = null;

  // Check if both tx_ref and id are null
  if (tx_ref === "null" && id === "null") {
    // If both are null, check for paymentReference to proceed to Monnify
    if (paymentReference) {
      transaction = await transactionModel.findOne({ paymentReference });
      if (!transaction) {
        return res.status(400).json({
          success: false,
          message: "Transaction not found",
        });
      }

      const token = await monnify.obtainAccessToken();
      const verify = await monnify.verifyPayment(
        transaction.transactionReference,
        token
      );
      console.log({ verify });

      if (verify.paymentStatus === "PAID") {
        if (transaction.status === "successful") {
          return res.status(400).json({
            success: false,
            message: "Failed: Possible duplicate Transaction",
          });
        }

        transaction.status = "successful";
        await transaction.save();

        // find user and update walletBalance
        const user = await userModel.findOne({ _id: transaction.userId });

        if (!user) {
          return res.status(400).send({
            success: false,
            message: "User not found",
          });
        }

        user.walletBalance += transaction.amount;
        await user.save();

        return res.status(200).send({
          success: true,
          data: {
            transaction,
            user,
          },
          message: "Transaction Successful",
        });
      } else if (verify.paymentStatus === "PENDING") {
        transaction.status = verify.paymentStatus;
        await transaction.save();
        return res.status(200).json({
          success: true,
          data: { transaction },
          message: "Transaction Pending",
        });
      } else if (verify.paymentStatus === "EXPIRED") {
        transaction.status = verify.paymentStatus;
        await transaction.save();
        return res.status(200).json({
          success: true,
          data: { transaction },
          message: "Transaction Expired",
        });
      } else {
        transaction.status = verify.paymentStatus;
        await transaction.save();
        return res.status(400).json({
          success: false,
          message: "Transaction was not successful",
          errMessage: verify,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Both transaction_id and tx_ref cannot be null, and paymentReference is required.",
      });
    }
  } else if (tx_ref !== "null" || id !== "null") {
    if (tx_ref) {
      transaction = await transactionModel.findOne({ tx_ref });
    } else if (id) {
      transaction = await transactionModel.findOne({
        transactionReference: id,
      });
    }

    if (status === "cancelled") {
      transaction.status = "cancelled";
      await transaction.save();
      return res.status(400).json({
        success: false,
        message: "Transaction cancelled.",
      });
    }

    const verify = await FLW_services.verifyTransaction(id);
    console.log("🚀 ~ getVerifyController ~ verify:", verify);

    if (verify?.status === "error") {
      return res.status(400).json({
        success: false,
        message: verify?.message,
      });
    }

    if (verify?.status === "successful") {
      if (transaction.status === "successful") {
        return res.status(400).json({
          success: false,
          message: "Failed: Possible duplicate Transaction",
        });
      }

      transaction.status = verify?.status;
      transaction.paymentReference = verify?.id || id;
      transaction.transactionReference = verify?.id || id;
      await transaction.save();
    }

    const user = await userModel.findOne({ _id: transaction?.userId });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    user.walletBalance += transaction.amount;
    await user.save();

    return res.status(200).json({
      success: true,
      data: { transaction, user },
      message: "Transaction Successful",
    });
  }

  console.log("🚀 ~ getVerifyController ~ transaction:", transaction);

  if (!transaction) {
    return res.status(400).json({
      success: false,
      message: "Transaction not found",
    });
  }
});

// Verify "Fund Guest Voucher transaction"
const getVerifyGuestFundController = asyncHandler(async (req, res, next) => {
  const { tId } = req.query;

  //extract paymentReference, tx_ref and status from db
  const oneTransaction = await guestTransactionModel.findOne({ _id: tId });

  const tx_ref = oneTransaction.tx_ref;
  const status = oneTransaction.status;
  const transactionId = oneTransaction.transactionReference;
  const paymentReference = oneTransaction.paymentReference;
  console.log("🚀 ~ getVerifyController ~ req.query:", req.query);
  console.log({ paymentReference, transactionId, tx_ref });
  console.log(!tx_ref && !transactionId);
  console.log(tx_ref === "null" && transactionId === "null");

  let transaction = null;

  if (paymentReference) {
    transaction = await guestTransactionModel.findOne({ paymentReference });
    if (!transaction) {
      return res.status(400).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const token = await monnify.obtainAccessToken();
    const verify = await monnify.verifyPayment(
      transaction.transactionReference,
      token
    );
    console.log("verifyTTT", { verify });

    if (verify.paymentStatus === "PAID") {
      if (transaction.status === "successful") {
        return res.status(400).json({
          success: false,
          message: "Failed: Possible duplicate Transaction",
        });
      }

      transaction.status = "successful";
      await transaction.save();

      // find voucher
      const voucher = await guestVoucherModel.findOne({
        _id: transaction.voucherId,
      });

      if (!voucher) {
        return res.status(400).send({
          success: false,
          message: "Voucher not found",
        });
      }

      return res.status(200).send({
        success: true,
        data: {
          transaction,
          voucher,
        },
        message: "Transaction Successful",
      });
    } else if (verify.paymentStatus === "PENDING") {
      transaction.status = verify.paymentStatus;
      await transaction.save();
      return res.status(200).json({
        success: true,
        data: { transaction },
        message: "Transaction Pending",
      });
    } else if (verify.paymentStatus === "EXPIRED") {
      transaction.status = verify.paymentStatus;
      await transaction.save();
      return res.status(200).json({
        success: true,
        data: { transaction },
        message: "Transaction Expired",
      });
    } else {
      transaction.status = verify.paymentStatus;
      await transaction.save();
      return res.status(400).json({
        success: false,
        message: "Transaction was not successful",
        errMessage: verify,
      });
    }
  }

  if (tx_ref !== "null" || transactionId !== "null") {
    if (tx_ref) {
      transaction = await guestTransactionModel.findOne({ tx_ref });
    } else if (transactionId) {
      transaction = await guestTransactionModel.findOne({
        transactionReference: transactionId,
      });
    }

    if (status === "cancelled") {
      transaction.status = "cancelled";
      await transaction.save();
      return res.status(400).json({
        success: false,
        message: "Transaction cancelled.",
      });
    }

    // const verify = await FLW_services.verifyTransaction(transactionId);
    // console.log("🚀 ~ getVerifyGuestFundController ~ verify:", verify);

    // if (verify?.status === "error") {
    //   return res.status(400).json({
    //     success: false,
    //     message: verify?.message,
    //   });
    // }

    // if (verify?.status === "successful") {
    //   if (transaction.status === "successful") {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Failed: Possible duplicate Transaction",
    //     });
    //   }

    //   transaction.status = verify?.status;
    //   transaction.paymentReference = verify?.id || transactionId;
    //   transaction.transactionReference = verify?.id || transactionId;
    //   await transaction.save();
    // }

    // const user = await userModel.findOne({ _id: transaction?.userId });
    // if (!user) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "User not found",
    //   });
    // }

    // user.walletBalance += transaction.amount;
    // await user.save();

    // return res.status(200).json({
    //   success: true,
    //   data: { transaction, voucher },
    //   message: "Transaction Successful",
    // });
  }

  console.log("🚀 ~ getVerifyGuestFundController ~ transaction:", transaction);

  if (!transaction) {
    return res.status(400).json({
      success: false,
      message: "Transaction not found",
    });
  }
});

// Verify "Fund wallet transaction webhook"
const verifyWalletFundWebhook = asyncHandler(async (req, res, next) => {
  // const FLW_SECRET_HASH = "FLWSECK_TEST-1012ed4289da7ede614b9ee473c698b0-X";
  console.log(
    "🚀 ~ verifyWalletFundWebhook ~ secretHash: HERE in Webhook!!!!!"
  );
  const signature = req.headers["verif-hash"];
  console.log("🚀 ~ verifyWalletFundWebhook ~ signature:", signature);
  console.log(
    "🚀 ~ verifyWalletFundWebhook ~ FLW_SECRET_HASH:",
    FLW_SECRET_HASH
  );
  if (!signature || signature !== FLW_SECRET_HASH) {
    // res.status(401).end();
    // res.status(200).end();
    return res.status(200).send({
      success: false,
      message: "Invalid hash signature",
    });
  }

  const payload = req.body;
  console.log("🚀 ~ verifyWalletFundWebhook ~ payload:", payload);

  let transaction;
  if (payload?.tx_ref) {
    transaction = await transactionModel.findOne({
      tx_ref: payload?.tx_ref,
    });
  } else if (payload?.id) {
    transaction = await transactionModel.findOne({
      transactionReference: payload?.id,
    });
  }

  if (!transaction) {
    return res.status(200).send({
      success: false,
      message: "Transaction not found",
    });
  }

  if (payload?.status === "cancelled") {
    transaction.status = "cancelled";
    await transaction.save();
    return res.status(200).send({
      success: false,
      message: "Transaction cancelled.",
    });
  }

  if (transaction.status === "successful") {
    return res.status(200).send({
      success: false,
      message: "Failed: Possible duplicate Transaction",
    });
  }

  // update transaction
  // transaction.status = "successful";
  transaction.status = payload?.status;
  transaction.paymentReference = payload?.id;
  transaction.transactionReference = payload?.id;
  await transaction.save();
  console.log(
    "🚀 ~ file: utils.controller.js:125 ~ getVerifyController:asyncHandler ~ transaction:",
    transaction
  );

  // find user and update walletBalance
  const user = await userModel.findOne({ _id: transaction.userId });

  if (!user) {
    return res.status(200).send({
      success: false,
      message: "User not found",
    });
  }

  user.walletBalance = user.walletBalance + transaction.amount;
  console.log(
    "🚀 ~ file: utils.controller.js:139 ~ getVerifyController:asyncHandler ~ user:",
    user
  );
  await user.save();

  return res.status(200).send({
    success: true,
    data: {
      transaction,
      user,
    },
    message: "Transaction Successful",
  });
});

// Withdraw from wallet
const postWithdrawFromWalletController = asyncHandler(
  async (req, res, next) => {
    const { amount, bankCode, accountNumber } = req.body;
    console.log("🚀 ~ req.body:", req.body);

    const transREf = await tx_ref.get_Tx_Ref();

    // const body = {...req.body };

    // // Run Hapi/Joi validation
    // const { error } = await cashoutVoucherValidation.validateAsync(body);
    // if (error) return res.status(400).send(error.details[0].message);

    // find voucher using voucherCode
    const user = await userModel.findOne({
      _id: req.user._id,
    });
    console.log(
      "🚀 ~ file: utils.controller.js:311 ~ postWithdrawFromWalletController:asyncHandler ~ user:",
      user
    );

    if (!user) {
      return res.status(400).send({
        success: false,
        message: "User does not exist.",
      });
    }

    if (parseInt(amount) > user.walletBalance) {
      return res.status(400).send({
        success: false,
        message: "Reqested funds exceed wallet balance.",
      });
    }

    // withdraw money to user
    // const payload = {
    //   account_bank: bankCode,
    //   account_number: accountNumber,
    //   amount: amount,
    //   ref: tx_ref.get_Tx_Ref(),
    //   narration: "Withdrawal from usepays.co wallet",
    //   currency: "NGN",
    //   // callback_url: "https://6f83-197-210-77-13.ngrok.io/api/utils/transfer/webhook",
    //   // debit_currency: "NGN",
    // };

    // const transfer = await FLW_services.transferMoney(payload);
    // if (transfer.status == "error")
    //   return next(new ErrorResponse(transfer.message, 403));
    // console.log(
    //   "🚀 ~ file: utils.controller.js:339 ~ postWithdrawFromWalletController:asyncHandler ~ transfer:",
    //   transfer
    // );

    // Good ol' monnify
    payload = {
      amount: amount,
      destinationBankCode: bankCode,
      destinationAccountNumber: accountNumber,
      destinationAccountName: user.name,
      tx_ref: transREf,
    };

    // const token = await monnify.obtainAccessToken();
    const token = await monnify.obtainSpikkAccessToken();
    const withdrawFromWallet = await monnify.withdraw(payload, token);
    console.log(
      "🚀 ~ file: utils.controller.js:359 ~ postWithdrawFromWalletController:asyncHandler ~ withdrawFromWallet:",
      withdrawFromWallet
    );

    if (withdrawFromWallet?.status !== "SUCCESS") {
      return res.status(400).send({
        success: false,
        message: "Transfer was not successful.",
      });
    }

    // // remove money from dashboard wallet to it doesn't still appear
    user.walletBalance = user.walletBalance - amount;
    await user.save();

    return res.status(200).send({
      success: true,
      message: `Successfully withdrawn ${amount} from your 'pays' wallet`,
    });

    // Good ol' monnify (Former)
    // const {
    //   amount,
    //   destinationBankCode,
    //   destinationAccountNumber,
    //   destinationAccountName,
    // } = req.body;

    // const token = await monnify.obtainAccessToken();
    // const withdrawMoney = await monnify.withdraw(req.body, token);

    // if (withdrawMoney.status !== "SUCCESS") {
    //   return res.status(400).send({
    //     success: false,
    //     message: "Transfer was not successful.",
    //   });
    // }
  }
);

// create voucher
// const postCreateVoucherController = asyncHandler(async (req, res, next) => {
//   const {
//     title,
//     description,
//     voucherKey,
//     totalNumberOfVouchers,
//     amountPerVoucher,
//     expiry_date,
//     amount,
//   } = req.body;

//   if (amountPerVoucher < 100) {
//     return res.status(400).send({
//       success: false,
//       message: "Amount cannot be less than 100, please increase the amount",
//     });
//   }

//   // ******** FETCH RECIPIENTS ******* //
//   let recipients = [];
//   // get from body
//   if (req.body?.recipients) recipients = req.body.recipients;
//   // get from files
//   if (req.files?.recipients) {
//     // Accessing recipients file
//     const recipientsFile = req.files.recipients[0];
//     // Parse recipients Excel file
//     const workbook = xlsx.read(recipientsFile.buffer, { type: "buffer" });
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const recipientsData = xlsx.utils.sheet_to_json(sheet);
//     recipients = recipientsData;
//   }

//   const cmgFee = parseInt(totalNumberOfVouchers * 10);
//   const totalAmount = parseInt(totalNumberOfVouchers * amountPerVoucher);
//   let thumbnail = "";

//   // Do simple maths to know if numbers match
//   if (req.user.walletBalance < totalAmount + cmgFee) {
//     return res.status(400).send({
//       success: false,
//       message: "Insufficient wallet balance, please fund wallet",
//     });
//   }

//   // Generate voucher code
//   const alphabets = [
//     "a",
//     "b",
//     "c",
//     "d",
//     "e",
//     "f",
//     "g",
//     "h",
//     "i",
//     "j",
//     "k",
//     "l",
//     "m",
//     "n",
//     "o",
//     "p",
//     "q",
//     "r",
//     "s",
//     "t",
//     "u",
//     "v",
//     "w",
//     "x",
//     "y",
//     "z",
//     "A",
//     "B",
//     "C",
//     "D",
//     "E",
//     "F",
//     "G",
//     "H",
//     "I",
//     "J",
//     "K",
//     "L",
//     "M",
//     "N",
//     "O",
//     "P",
//     "Q",
//     "R",
//     "S",
//     "T",
//     "U",
//     "V",
//     "W",
//     "X",
//     "Y",
//     "Z",
//   ];

//   const rand = Math.floor(Math.random() * 48);
//   const rand2 = Math.floor(Math.random() * 48);
//   const rand3 = Math.floor(Math.random() * 48);
//   const rand4 = Math.floor(Math.random() * 48);

//   const specialKey = `${alphabets[rand]}${rand}${alphabets[rand3]}${alphabets[rand2]}`;

//   console.log("🚀 ~ postCreateVoucherController ~ specialKey:", specialKey);
//   // // Do simple maths to know if numbers match again just to be safe
//   // if (totalNumberOfVouchers * amountPerVoucher != totalAmount) {
//   //     return res.status(400).send({
//   //         success: false,
//   //         message: "Error! please check numbers and try again",
//   //     });
//   // }

//   // // Check walletBalance before transaction
//   // if (req.user.walletBalance < totalAmount) {
//   //     return res.status(400).send({
//   //         success: false,
//   //         message: "Insufficient wallet balance, please fund wallet",
//   //     });
//   // }

//   // Check if voucherKEy already exists
//   const foundVoucherKey = await voucherModel.findOne({
//     specialKey: `${voucherKey}-${specialKey}`,
//   });
//   if (foundVoucherKey) {
//     return res
//       .status(400)
//       .send("Voucher Key already exists, please try another.");
//   }

//   let voucherCoupons = [];

//   // create loop based on number of vouchers
//   for (let i = 1; i <= totalNumberOfVouchers; i++) {
//     // const time = moment().format("yy-MM-DD hh:mm:ss");
//     // const ref = time.replace(/[\-]|[\s]|[\:]/g, "");

//     const voucherCode = `${voucherKey}-${specialKey}-${alphabets[rand4]}${rand}${rand3}${alphabets[rand3]}`;

//     voucherCoupons.push({
//       couponId: i,
//       couponCode: voucherCode,
//       status: "pending",
//       cashedBy: "No one yet",
//       cashedDate: "Not yet",
//       cashedTime: "Not yet",
//     });
//   }

//   const body = { ...req.body, thumbnail: req.file, voucherCoupons };

//   // Run Hapi/Joi validation
//   const { error } = await createVoucherValidation.validateAsync(body);
//   if (error) {
//     return res.status(400).send({
//       success: false,
//       message: "Validation failed",
//       errMessage: error.details[0].message,
//     });
//   }

//   if (req.files?.thumbnail) {
//     // send image to Cloudinary
//     thumbnail = await uploadThumbnail(req.files.thumbnail);
//   }

//   // create voucher
//   const voucher = new voucherModel({
//     userId: req.user.id,
//     title,
//     thumbnail,
//     description,
//     voucherKey,
//     specialKey: `${voucherKey}-${specialKey}`,
//     totalNumberOfVouchers,
//     amountPerVoucher,
//     totalAmount,
//     expiry_date,
//     voucherCoupons,
//     recipients,
//   });
//   await voucher.save();

//   // get user
//   const user = await userModel.findOne({ _id: req.user._id });
//   if (!user) {
//     return res.status(400).send({
//       success: false,
//       message: "Couldn't find user",
//     });
//   }

//   // format expiry date
//   // Parse the expiry date string
//   const expiryDate = moment(expiry_date, "YYYY-MM-DD:HH:mm:ss");

//   // Format the expiry date in your desired format
//   const formattedExpiryDate = expiryDate?.format("YYYY-MMM-DD HH:mm:ss");

//   // send mail to recipients
//   if (recipients) {
//     recipients.map((recipient, i) => {
//       // Send email
//       const mailOptions = {
//         to: recipient.recipient_email,
//         subject: `New coupon from ${user?.name}`,
//         html: newVoucherMail(
//           user?.name,
//           recipient?.recipient_name ? recipient?.recipient_name : "",
//           voucherCoupons[i]?.couponCode,
//           amountPerVoucher,
//           formattedExpiryDate
//         ),
//       };

//       sendMail(mailOptions);
//     });
//   }

//   user.walletBalance = user.walletBalance - (totalAmount + cmgFee);
//   await user.save();

//   console.log(
//     "🚀 ~ file: utils.controller.js:50 ~ postCreateVoucherController:asyncHandler ~ voucher:",
//     voucher
//   );

//   return res.status(200).send({
//     success: true,
//     data: {
//       voucher: voucher,
//     },
//     message: "Created new voucher(s).",
//   });
// });

// create voucher
const postCreateVoucherController = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    voucherKey,
    totalNumberOfVouchers,
    amountPerVoucher,
    backgroundStyle,
    logo,
    // expiry_date,
  } = req.body;

  //Initialize empty variables
  let logoUploadUrl = null;

  // send image to Cloudinary
  if (req.files && req.files.logo && req.files.logo[0]) {
    logoUploadUrl = await uploadLogo(req.files?.logo[0], "logo");
  }

  // make total number of voucher should not be greater than 20 and amount per voucher should not be less than 100 and greater than 20000
  if (totalNumberOfVouchers > 20) {
    return res.status(400).send({
      success: false,
      message: "Total number of voucher should not be greater than 20",
    });
  }

  if (amountPerVoucher < 100 || amountPerVoucher > 20000) {
    return res.status(400).send({
      success: false,
      message:
        "Amount per voucher should not be less than 100 and greater than 20000",
    });
  }

  console.log(
    "🚀 ~ postCreateVoucherController ~ totalNumberOfVouchers:",
    totalNumberOfVouchers
  );

  console.log(
    "🚀 ~ postCreateVoucherController ~ amountPerVoucher:",
    amountPerVoucher
  );

  if (amountPerVoucher < 100) {
    return res.status(400).send({
      success: false,
      message: "Amount cannot be less than 100, please increase the amount",
    });
  }

  let cmgFee;
  // cmgFee = parseInt(totalNumberOfVouchers * 150);
  if (totalNumberOfVouchers > 0 && totalNumberOfVouchers <= 10) {
    cmgFee = parseInt(totalNumberOfVouchers * 150);
  }
  if (totalNumberOfVouchers > 10 && totalNumberOfVouchers <= 50) {
    cmgFee = parseInt(totalNumberOfVouchers * 120);
  }
  if (totalNumberOfVouchers > 50) {
    cmgFee = parseInt(totalNumberOfVouchers * 100);
  }
  console.log("🚀 ~ postCreateVoucherController ~ cmgFee:", cmgFee);

  const totalAmount = parseInt(
    totalNumberOfVouchers * amountPerVoucher + cmgFee
  );
  // let thumbnail = "";

  // Do simple maths to know if numbers match
  if (req.user.walletBalance < totalAmount) {
    return res.status(400).send({
      success: false,
      message: "Insufficient wallet balance, please fund wallet",
    });
  }

  // Generate voucher code
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

  const specialKey = `${alphabets[rand]}${rand}${alphabets[rand3]}${alphabets[rand2]}`;

  console.log("🚀 ~ postCreateVoucherController ~ specialKey:", specialKey);

  // Check if voucherKEy already exists
  const foundVoucherKey = await voucherModel.findOne({
    specialKey: `${voucherKey}-${specialKey}`,
  });
  if (foundVoucherKey) {
    return res
      .status(400)
      .send("Voucher Key already exists, please try another.");
  }

  let voucherCoupons = [];

  // create loop based on the number of vouchers
  for (let i = 1; i <= totalNumberOfVouchers; i++) {
    // Generate new random indices for each voucher
    const rand = Math.floor(Math.random() * alphabets.length);
    const rand2 = Math.floor(Math.random() * alphabets.length);
    const rand3 = Math.floor(Math.random() * alphabets.length);
    const rand4 = Math.floor(Math.random() * alphabets.length);

    // Generate a unique voucher code using the new random values
    const voucherCode = `${voucherKey}-${specialKey}-${alphabets[rand4]}${rand}${rand3}${alphabets[rand3]}`;

    voucherCoupons.push({
      couponId: i,
      couponCode: voucherCode,
      status: "pending",
      cashedBy: "No one yet",
      cashedDate: "Not yet",
      cashedTime: "Not yet",
    });
  }

  // const body = { ...req.body, thumbnail: req.file, voucherCoupons };
  const body = { ...req.body, logo: logoUploadUrl ?? "", voucherCoupons };

  // Run Hapi/Joi validation
  const { error } = await createVoucherValidation.validateAsync(body);
  if (error) {
    return res.status(400).send({
      success: false,
      message: "Validation failed",
      errMessage: error.details[0].message,
    });
  }

  // if (req.files?.thumbnail) {
  //   // send image to Cloudinary
  //   thumbnail = await uploadThumbnail(req.files.thumbnail);
  // }

  // create voucher
  const voucher = new voucherModel({
    userId: req.user.id,
    title,
    backgroundStyle,
    logo: `${logoUploadUrl}` ?? "",
    description,
    voucherKey,
    specialKey: `${voucherKey}-${specialKey}`,
    totalNumberOfVouchers,
    amountPerVoucher,
    totalAmount,
    // expiry_date,
    voucherCoupons,
  });
  await voucher.save();
  console.log("🚀 ~ postCreateVoucherController ~ voucher:", voucher);
  // get user
  const user = await userModel.findOne({ _id: req.user._id });
  if (!user) {
    return res.status(400).send({
      success: false,
      message: "Couldn't find user",
    });
  }

  // format expiry date
  // Parse the expiry date string
  // const expiryDate = moment(expiry_date, "YYYY-MM-DD:HH:mm:ss");

  // Format the expiry date in your desired format
  // const formattedExpiryDate = expiryDate?.format("YYYY-MMM-DD HH:mm:ss");

  // // send mail to recipients
  // if (recipients) {
  //   recipients.map((recipient, i) => {
  //     // Send email
  //     const mailOptions = {
  //       to: recipient.recipient_email,
  //       subject: `New coupon from ${user?.name}`,
  //       html: newVoucherMail(
  //         user?.name,
  //         recipient?.recipient_name ? recipient?.recipient_name : "",
  //         voucherCoupons[i]?.couponCode,
  //         amountPerVoucher,
  //         formattedExpiryDate
  //       ),
  //     };

  //     sendMail(mailOptions);
  //   });
  // }

  console.log(
    "🚀 ~ postCreateVoucherController ~ user.walletBalance 1: ",
    user.walletBalance
  );
  console.log("🚀 ~ postCreateVoucherController ~ totalAmount:", totalAmount);
  console.log("🚀 ~ postCreateVoucherController ~ cmgFee:", cmgFee);
  console.log(
    "🚀 ~ postCreateVoucherController ~ totalAmount + cmgFee:",
    totalAmount + cmgFee
  );
  user.walletBalance = user.walletBalance - totalAmount;
  console.log(
    "🚀 ~ postCreateVoucherController ~ user.walletBalance 2 : ",
    user.walletBalance
  );
  await user.save();

  console.log(
    "🚀 ~ file: utils.controller.js:50 ~ postCreateVoucherController:asyncHandler ~ voucher:",
    voucher
  );

  return res.status(200).send({
    success: true,
    data: {
      voucher: voucher,
    },
    message: "Created new voucher(s).",
  });
});

// create guest voucher
const postCreateGuestVoucherController = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    voucherKey,
    totalNumberOfVouchers,
    amountPerVoucher,
    backgroundStyle,
    logo,
    // expiry_date,
  } = req.body;

  //Initialize empty variables
  let logoUploadUrl = null;

  // send image to Cloudinary
  if (req.files && req.files.logo && req.files.logo[0]) {
    logoUploadUrl = await uploadLogo(req.files?.logo[0], "logo");
  }

  // make total number of voucher should not be greater than 20 and amount per voucher should not be less than 100 and greater than 20000
  if (totalNumberOfVouchers > 20) {
    return res.status(400).send({
      success: false,
      message: "Total number of voucher should not be greater than 20",
    });
  }

  if (amountPerVoucher < 100 || amountPerVoucher > 20000) {
    return res.status(400).send({
      success: false,
      message:
        "Amount per voucher should not be less than 100 and greater than 20000",
    });
  }

  console.log(
    "🚀 ~ postCreateVoucherController ~ totalNumberOfVouchers:",
    totalNumberOfVouchers
  );

  console.log(
    "🚀 ~ postCreateVoucherController ~ amountPerVoucher:",
    amountPerVoucher
  );

  if (amountPerVoucher < 100) {
    return res.status(400).send({
      success: false,
      message: "Amount cannot be less than 100, please increase the amount",
    });
  }

  let cmgFee;
  // cmgFee = parseInt(totalNumberOfVouchers * 150);
  if (totalNumberOfVouchers > 0 && totalNumberOfVouchers <= 10) {
    cmgFee = parseInt(totalNumberOfVouchers * 150);
  }
  if (totalNumberOfVouchers > 10 && totalNumberOfVouchers <= 50) {
    cmgFee = parseInt(totalNumberOfVouchers * 120);
  }
  if (totalNumberOfVouchers > 50) {
    cmgFee = parseInt(totalNumberOfVouchers * 100);
  }
  console.log("🚀 ~ postCreateVoucherController ~ cmgFee:", cmgFee);

  const totalAmount = parseInt(
    totalNumberOfVouchers * amountPerVoucher + cmgFee
  );
  // let thumbnail = "";

  // Do simple maths to know if numbers match
  // if (req.user.walletBalance < totalAmount) {
  //   return res.status(400).send({
  //     success: false,
  //     message: "Insufficient wallet balance, please fund wallet",
  //   });
  // }

  // Generate voucher code
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

  const specialKey = `${alphabets[rand]}${rand}${alphabets[rand3]}${alphabets[rand2]}`;

  console.log("🚀 ~ postCreateVoucherController ~ specialKey:", specialKey);

  // Check if voucherKEy already exists
  const foundVoucherKey = await voucherModel.findOne({
    specialKey: `${voucherKey}-${specialKey}`,
  });
  if (foundVoucherKey) {
    return res
      .status(400)
      .send("Voucher Key already exists, please try another.");
  }

  let voucherCoupons = [];

  // create loop based on the number of vouchers
  for (let i = 1; i <= totalNumberOfVouchers; i++) {
    // Generate new random indices for each voucher
    const rand = Math.floor(Math.random() * alphabets.length);
    const rand2 = Math.floor(Math.random() * alphabets.length);
    const rand3 = Math.floor(Math.random() * alphabets.length);
    const rand4 = Math.floor(Math.random() * alphabets.length);

    // Generate a unique voucher code using the new random values
    const voucherCode = `${voucherKey}-${specialKey}-${alphabets[rand4]}${rand}${rand3}${alphabets[rand3]}`;

    voucherCoupons.push({
      couponId: i,
      couponCode: voucherCode,
      status: "pending",
      cashedBy: "No one yet",
      cashedDate: "Not yet",
      cashedTime: "Not yet",
    });
  }

  // const body = { ...req.body, thumbnail: req.file, voucherCoupons };
  const body = { ...req.body, logo: logoUploadUrl ?? "", voucherCoupons };

  // Run Hapi/Joi validation
  const { error } = await createVoucherValidation.validateAsync(body);
  if (error) {
    return res.status(400).send({
      success: false,
      message: "Validation failed",
      errMessage: error.details[0].message,
    });
  }

  // if (req.files?.thumbnail) {
  //   // send image to Cloudinary
  //   thumbnail = await uploadThumbnail(req.files.thumbnail);
  // }

  // create voucher
  const voucher = new guestVoucherModel({
    // userId: req.user.id,
    title,
    backgroundStyle,
    logo: `${logoUploadUrl}` ?? "",
    description,
    voucherKey,
    specialKey: `${voucherKey}-${specialKey}`,
    totalNumberOfVouchers,
    amountPerVoucher,
    totalAmount,
    // expiry_date,
    voucherCoupons,
  });
  await voucher.save();
  console.log("🚀 ~ postCreateGuestVoucherController ~ voucher:", voucher);
  // get user
  // const user = await userModel.findOne({ _id: req.user._id });
  // if (!user) {
  //   return res.status(400).send({
  //     success: false,
  //     message: "Couldn't find user",
  //   });
  // }

  // format expiry date
  // Parse the expiry date string
  // const expiryDate = moment(expiry_date, "YYYY-MM-DD:HH:mm:ss");

  // Format the expiry date in your desired format
  // const formattedExpiryDate = expiryDate?.format("YYYY-MMM-DD HH:mm:ss");

  // // send mail to recipients
  // if (recipients) {
  //   recipients.map((recipient, i) => {
  //     // Send email
  //     const mailOptions = {
  //       to: recipient.recipient_email,
  //       subject: `New coupon from ${user?.name}`,
  //       html: newVoucherMail(
  //         user?.name,
  //         recipient?.recipient_name ? recipient?.recipient_name : "",
  //         voucherCoupons[i]?.couponCode,
  //         amountPerVoucher,
  //         formattedExpiryDate
  //       ),
  //     };

  //     sendMail(mailOptions);
  //   });
  // }

  // console.log(
  //   "🚀 ~ postCreateVoucherController ~ user.walletBalance 1: ",
  //   user.walletBalance
  // );
  console.log("🚀 ~ postCreateVoucherController ~ totalAmount:", totalAmount);
  console.log("🚀 ~ postCreateVoucherController ~ cmgFee:", cmgFee);
  console.log(
    "🚀 ~ postCreateVoucherController ~ totalAmount + cmgFee:",
    totalAmount + cmgFee
  );
  // user.walletBalance = user.walletBalance - totalAmount;
  // console.log(
  //   "🚀 ~ postCreateVoucherController ~ user.walletBalance 2 : ",
  //   user.walletBalance
  // );
  // await user.save();

  console.log(
    "🚀 ~ file: utils.controller.js:50 ~ postCreateVoucherController:asyncHandler ~ voucher:",
    voucher
  );

  return res.status(200).send({
    success: true,
    data: {
      voucher: voucher,
    },
    message: "Created new voucher(s).",
  });
});

//create voucher draft
const postCreateVoucherDraftController = asyncHandler(async (req, res, next) => {

  const {
    userId,
    title,
    description,
    voucherKey,
    totalNumberOfVouchers,
    amountPerVoucher,
    backgroundStyle,
    logo,
    expiryDate,
  } = req.body;

  //   check if user exist
  const user = await userModel.findOne({ _id: userId });

  if (!user) {
    return res.status(400).send({
      success: false,
      message: "Couldn't find user",
    });
  }

  await user.save();

  //Initialize empty variables
  let logoUploadUrl = null;

  // send image to Cloudinary
  if (req.files && req.files.logo && req.files.logo[0]) {
    logoUploadUrl = await uploadLogo(req.files?.logo[0], "logo");
  }

  const body = { ...req.body }

  // Run Hapi/Joi validation
  const { error } = await createVoucherDraftValidation.validateAsync(body);
  if (error) {
    return res.status(400).send({
      success: false,
      message: "Validation failed",
      errMessage: error.details[0].message,
    });
  }

  // create voucher draft
  const voucherDraft = new voucherDraftModel({
    userId: user._id,
    title,
    backgroundStyle,
    logo,
    description,
    voucherKey,
    totalNumberOfVouchers,
    amountPerVoucher,
    expiryDate,
  });

  await voucherDraft.save();

  console.log("🚀 ~ postCreateVoucherDraftController ~ voucher:", voucherDraft);



  // format expiry date
  // Parse the expiry date string
  // const expiryDate = moment(expiry_date, "YYYY-MM-DD:HH:mm:ss");

  // Format the expiry date in your desired format
  // const formattedExpiryDate = expiryDate?.format("YYYY-MMM-DD HH:mm:ss");

  return res.status(200).send({
    success: true,
    message: "Draft sucessfully saved.",
  });
});

// find one voucher draft
const getOneVoucherDraftController = asyncHandler(async (req, res, next) => {
  const { draftId } = req.params;
  const { userId } = req.query;

  try {
    const draft = await voucherDraftModel.findOne({
      _id: draftId,
      userId: userId,
    });
    console.log(
      "🚀 ~ file: utils.controller.js:1183 ~ getOneVoucherDraftController:asyncHandler ~ draft:",
      draft
    );

    if (!draft) {
      return res.status(400).send({
        success: false,
        message: "Draft not found",
      });
    }

    return res.status(200).send({
      success: true,
      data: {
        voucher: {
          title: draft.title,
          logo: draft.logo,
          createdAt: draft.createdAt,
          expiryDate: draft.expiryDate,
          voucherKey: draft.voucherKey,
          description: draft.description,
          amountPerVoucher: draft.amountPerVoucher,
          backgroundStyle: draft.backgroundStyle,
          totalNumberOfVouchers: draft.totalNumberOfVouchers,
        },
      },
      message: "Draft fetched successfully.",
    });
  } catch (error) {
    console.log("🚀 ~ getOneVoucherDraftController ~ error:", error);
    return res.status(400).send({
      success: false,
      message: "Couldn't find draft.",
    });
  }
});

// find all voucher drafts
const getAllVoucherDraftsController = asyncHandler(async (req, res, next) => {
  const { userId } = req.query;

  try {
    const allDrafts = await voucherDraftModel.find({
      userId: userId,
    });
    console.log(
      "🚀 ~ file: utils.controller.js:1183 ~ getAllVoucherDraftsController:asyncHandler ~ allDrafts:",
      allDrafts
    );

    if (!allDrafts) {
      return res.status(400).send({
        success: false,
        message: "Draft not found",
      });
    }

    return res.status(200).send({
      success: true,
      data: allDrafts,
      message: "All Drafts fetched successfully.",
    });
  } catch (error) {
    console.log("🚀 ~ getAllVoucherDraftsController ~ error:", error);
    return res.status(400).send({
      success: false,
      message: "Couldn't find all drafts.",
    });
  }
});


// update voucher
// const putUpdateVoucherController = asyncHandler(async (req, res, next) => {
//   const { specialKey } = req.query;

//   // find voucher using voucherCode
//   const foundVoucher = await voucherModel.findOne({
//     specialKey: specialKey,
//   });

//   if (!foundVoucher) {
//     return res.status(400).send({
//       success: false,
//       message: "This coupon does not exist, please try another.",
//     });
//   }

//   // ******** FETCH RECIPIENTS ******* //
//   let recipients = [];
//   // get from body
//   if (req.body?.recipients) recipients = req.body.recipients;
//   // get from files
//   if (req.files?.recipients) {
//     // Accessing recipients file
//     const recipientsFile = req.files.recipients[0];
//     // Parse recipients Excel file
//     const workbook = xlsx.read(recipientsFile.buffer, { type: "buffer" });
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const recipientsData = xlsx.utils.sheet_to_json(sheet);
//     recipients = recipientsData;
//   }

//   console.log("🚀 ~ putUpdateVoucherController ~ recipients:", recipients);
//   foundVoucher.recipients = recipients;
//   await foundVoucher.save();

//   // get user
//   const user = await userModel.findOne({ _id: req.user._id });
//   console.log("🚀 ~ putUpdateVoucherController ~ user:", user);
//   if (!user) {
//     return res.status(400).send({
//       success: false,
//       message: "Couldn't find user",
//     });
//   }

//   // send mail to recipients
//   if (recipients) {
//     recipients.map((recipient, i) => {
//       // Send email
//       const mailOptions = {
//         to: recipient.recipient_email,
//         subject: `New coupon from ${user?.name}`,
//         html: newVoucherMail(
//           user?.name,
//           recipient?.recipient_name ? recipient?.recipient_name : "",
//           foundVoucher?.voucherCoupons[i]?.couponCode,
//           foundVoucher?.amountPerVoucher
//           // foundVoucher?.expiryDate
//         ),
//       };

//       sendMail(mailOptions);
//     });
//   }

//   console.log(
//     "🚀 ~ file: utils.controller.js:50 ~ putUpdateVoucherController:asyncHandler ~ foundVoucher: ",
//     foundVoucher
//   );

//   return res.status(200).send({
//     success: true,
//     data: {
//       voucher: foundVoucher,
//     },
//     message: "Updated voucher.",
//   });
// });

const putUpdateVoucherController = asyncHandler(async (req, res, next) => {
  const { specialKey } = req.query;

  // find voucher using voucherCode
  const foundVoucher = await voucherModel.findOne({
    specialKey: specialKey,
  });

  if (!foundVoucher) {
    return res.status(400).send({
      success: false,
      message: "This coupon does not exist, please try another.",
    });
  }

  // ******** FETCH RECIPIENTS ******* //
  let recipients = [];
  // get from body
  if (req.body?.recipients) recipients = req.body.recipients;
  // get from files
  if (req.files?.recipients) {
    // Accessing recipients file
    const recipientsFile = req.files.recipients[0];
    // Parse recipients Excel file
    const workbook = xlsx.read(recipientsFile.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const recipientsData = xlsx.utils.sheet_to_json(sheet);
    recipients = recipientsData;
  }

  // Ensure recipients is an array and properly formatted
  if (!Array.isArray(recipients)) {
    return res.status(400).send({
      success: false,
      message: "Recipients data is not in the correct format.",
    });
  }

  foundVoucher.recipients = recipients;

  try {
    await foundVoucher.save();
  } catch (error) {
    console.error("Error saving voucher:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to save voucher.",
    });
  }

  // get user
  const user = await userModel.findOne({ _id: req.user._id });
  console.log("🚀 ~ putUpdateVoucherController ~ user:", user);
  if (!user) {
    return res.status(400).send({
      success: false,
      message: "Couldn't find user",
    });
  }

  // send mail to recipients
  if (recipients) {
    recipients.map((recipient, i) => {
      if (!foundVoucher?.voucherCoupons[i]) {
        console.log("THE VOUCHERS FINISH, LOL!");
        return;
      }

      const { schedule_date, time_zone } = recipient;
      console.log("🚀 ~ putUpdateVoucherController ~ schedule_date:", schedule_date);

      // Convert to UTC in the specified time zone
      const utcDate = fromZonedTime(schedule_date, time_zone);

      // Send email
      const mailOptions = {
        to: recipient.recipient_email,
        subject: `New coupon from ${user?.name}`,
        html: newVoucherMail(
          user?.name,
          // recipient?.recipient_name ? recipient?.recipient_name : "",
          foundVoucher?.voucherCoupons[i]?.couponCode,
          foundVoucher?.description,
          foundVoucher?.logo,
          foundVoucher?.title,
          foundVoucher?.backgroundStyle,
        ),
        deliveryTime: utcDate ?? "",
      };

      sendMail(mailOptions);
    });
  }

  console.log(
    "🚀 ~ file: utils.controller.js:50 ~ putUpdateVoucherController:asyncHandler ~ foundVoucher: ",
    foundVoucher
  );

  return res.status(200).send({
    success: true,
    data: {
      voucher: foundVoucher,
    },
    message: "Updated voucher.",
  });
});

//update Guest recipient
const putUpdateGuestVoucherController = asyncHandler(async (req, res, next) => {
  const { voucherId } = req.params;

  // find voucher using voucherCode
  const foundVoucher = await guestVoucherModel.findOne({
    _id: voucherId,
  });

  if (!foundVoucher) {
    return res.status(400).send({
      success: false,
      message: "This coupon does not exist, please try another.",
    });
  }

  // ******** FETCH RECIPIENTS ******* //
  let recipients = [];
  // get from body
  if (req.body?.recipients) recipients = req.body.recipients;
  // get from files
  if (req.files?.recipients) {
    // Accessing recipients file
    const recipientsFile = req.files.recipients[0];
    // Parse recipients Excel file
    const workbook = xlsx.read(recipientsFile.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const recipientsData = xlsx.utils.sheet_to_json(sheet);
    recipients = recipientsData;
  }

  // Ensure recipients is an array and properly formatted
  if (!Array.isArray(recipients)) {
    return res.status(400).send({
      success: false,
      message: "Recipients data is not in the correct format.",
    });
  }

  foundVoucher.recipients = recipients;

  try {
    await foundVoucher.save();
  } catch (error) {
    console.error("Error saving voucher:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to save voucher.",
    });
  }

  // send mail to recipients
  if (recipients) {
    recipients.map((recipient, i) => {
      if (!foundVoucher?.voucherCoupons[i]) {
        console.log("THE VOUCHERS FINISH, LOL!");
        return;
      }

      const { schedule_date, time_zone } = recipient;
      console.log("🚀 ~ putUpdateGuestVoucherController ~ schedule_date:", schedule_date);

      // Convert to UTC in the specified time zone
      const utcDate = fromZonedTime(schedule_date, time_zone);

      // Send email
      const mailOptions = {
        to: recipient.recipient_email,
        subject: `New coupon from Anonymous`,
        html: newVoucherMail(
          "Anonymous",
          // recipient?.recipient_name ? recipient?.recipient_name : "",
          foundVoucher?.voucherCoupons[i]?.couponCode,
          foundVoucher?.description,
          foundVoucher?.logo,
          foundVoucher?.title,
          foundVoucher?.backgroundStyle
        ),
        deliveryTime: utcDate ?? "",
      };

      sendMail(mailOptions);
    });
  }

  console.log(
    "🚀 ~ file: utils.controller.js:50 ~ putUpdateGuestVoucherController:asyncHandler ~ foundVoucher: ",
    foundVoucher
  );

  return res.status(200).send({
    success: true,
    data: {
      voucher: foundVoucher,
    },
    message: "Voucher Recipient added.",
  });
});

// find voucher
const postFindVoucherController = asyncHandler(async (req, res, next) => {
  try {
    const { voucherCode } = req.body;
    console.log("🚀 ~ postFindVoucherController ~ voucherCode:", voucherCode);

    // find voucher using voucherCode
    const foundVoucher = await guestVoucherModel.findOne({
      // specialKey: "TRUSB-j9wo"
      specialKey: `${voucherCode.split("-")[0]}-${voucherCode.split("-")[1]}`,
    });
    console.log("🚀 ~ postFindVoucherController ~ foundVoucher:", foundVoucher);

    if (!foundVoucher) {
      return res.status(400).send({
        success: false,
        message: "This coupon does not exist, please try another.",
      });
    }

    let matchingCoupon;

    // search voucher coupons for matching code
    foundVoucher.voucherCoupons.map((item) => {
      if (item.couponCode === voucherCode) {
        if (item.status === "cashed") {
          return res.status(400).send({
            success: false,
            message: "This coupon has already been claimed, please try another",
          });
        }
        matchingCoupon = item;
      }
    });

    if (!matchingCoupon) {
      return res.status(400).send({
        success: false,
        message: "This coupon does not exist, please try another.",
      });
    }

    return res.status(200).send({
      success: true,
      data: {
        voucher: {
          title: foundVoucher.title,
          logo: foundVoucher.logo,
          description: foundVoucher.description,
          amount: foundVoucher.amountPerVoucher,
          description: foundVoucher.description,
          coupon: matchingCoupon,
          backgroundStyle: foundVoucher.backgroundStyle,
        },
      },
      message: "Claimed Coupon from Voucher successfully.",
    });
  } catch (error) {
    console.log("🚀 ~ postFindVoucherController ~ error:", error);
    return res.status(400).send({
      success: false,
      message: "Couldn't find voucher.",
    });
  }
});

// Cashout voucher
const postCashoutVoucherController = asyncHandler(async (req, res, next) => {
  const { fullName, email, voucherCode, bankCode, accountNumber } = req.body;

  const body = { ...req.body };

  // // Run Hapi/Joi validation
  const { error } = await cashoutVoucherValidation.validateAsync(body);
  if (error) {
    return res.status(400).send({
      success: false,
      message: "Validation failed",
      errMessage: error.details[0].message,
    });
  }

  // find voucher using voucherCode
  // const foundVoucher = await voucherModel.findOne({
  //   // specialKey: voucherCode.slice(0, 11),
  //   specialKey: `${voucherCode.split("-")[0]}-${voucherCode.split("-")[1]}`,
  // });

  // First, try to find the voucher in voucherModel.
  let foundVoucher = await voucherModel.findOne({ specialKey: `${voucherCode.split("-")[0]}-${voucherCode.split("-")[1]}` });

  // If not found in vucherModel, search in guestVoucherModel
  if (!foundVoucher) {
    foundVoucher = await guestVoucherModel.findOne({ specialKey: `${voucherCode.split("-")[0]}-${voucherCode.split("-")[1]}` });
  }

  console.log(
    "🚀 ~ file: utils.controller.js:348 ~ postCashoutVoucherController:asyncHandler ~ foundVoucher:",
    foundVoucher
  );

  if (!foundVoucher) {
    return res.status(400).send({
      success: false,
      message: "This coupon does not exist, please try another.",
    });
  }

  let matchingCoupon;

  // search voucher coupons for matching code
  foundVoucher.voucherCoupons.map((item) => {
    if (item.couponCode === voucherCode) {
      if (item.status === "cashed") {
        return res.status(400).send({
          success: false,
          message: "This coupon has already been claimed, please try another",
        });
      }
      matchingCoupon = item;
      // remove coupon from array if found so we can add it later after editing
      // foundVoucher.voucherCoupons.pop(item);
    }
  });

  if (!matchingCoupon) {
    return res.status(400).send({
      success: false,
      message: "This coupon does not exist, please try another.",
    });
  }

  const time = moment().format("yy-MM-DD hh:mm:ss");

  // Edit coupon details then add to array
  matchingCoupon.status = "cashed";
  matchingCoupon.cashedBy = fullName;
  matchingCoupon.cashedDate = time.split(" ")[0];
  matchingCoupon.cashedTime = time.split(" ")[1];

  // foundVoucher.voucherCoupons.push(matchingCoupon);

  const index = foundVoucher.voucherCoupons.indexOf(matchingCoupon);
  console.log(
    "🚀 ~ file: utils.controller.js:706 ~ postCashoutVoucherController:asyncHandler ~ index:",
    index
  );

  foundVoucher.voucherCoupons.splice(index, 1, matchingCoupon);

  // Add every other needed calculation stuff then save
  foundVoucher.totalCashedAmount =
    parseInt(foundVoucher.totalCashedAmount) +
    parseInt(foundVoucher.amountPerVoucher);

  foundVoucher.vouchersCashed = parseInt(foundVoucher.vouchersCashed) + 1;
  foundVoucher.cashedPercentage = (
    (parseInt(foundVoucher.vouchersCashed) /
      parseInt(foundVoucher.totalNumberOfVouchers)) *
    (100 / 1)
  ).toFixed(2);

  // Send mail to Voucher creator that <<fullName>> just cashed their voucher
  // find user Email
  const creator = await userModel.findOne({ _id: foundVoucher.userId });

  // Send email to Voucher creator
  if (creator) {
    const mailOptions = {
      to: creator.email,
      subject: "Voucher Claim Mail",
      html: voucherClaimMail(
        fullName,
        voucherCode,
        creator.name,
        foundVoucher.title,
        foundVoucher.amountPerVoucher
      ),
    };

    sendMail(mailOptions);

  }

  // Send email to Voucher winner
  const winnerMailOptions = {
    to: email,
    subject: "Voucher Claim Mail",
    html: winnerVoucherClaimMail(
      fullName,
      voucherCode,
      foundVoucher.title,
      foundVoucher.amountPerVoucher
    ),
  };

  const transREf = await tx_ref.get_Tx_Ref();
  console.log(
    "🚀 ~ file: utils.controller.js:752 ~ postCashoutVoucherController:asyncHandler ~ transREf:",
    transREf
  );

  // // The bulk that is FLUTTERWAVE...*sigh*
  // // withdraw money to <<fullName>>
  // const payload = {
  //   account_bank: bankCode,
  //   account_number: accountNumber,
  //   amount: foundVoucher.amountPerVoucher,
  //   narration: "Voucher Redemption at usepays.co",
  //   currency: "NGN",
  //   // reference: transREf,
  //   // reference: "dfs23fhr7ntg0293039_PMCK",
  //   callback_url: "https://www.usepays.co/",
  //   debit_currency: "NGN",
  // };

  // const details = {
  //   // account_bank: "044",
  //   // account_number: "0768010549",
  //   account_bank: bankCode,
  //   account_number: accountNumber,
  //   amount: 100,
  //   currency: "NGN",
  //   narration: "Payment for things",
  //   ref: tx_ref.get_Tx_Ref(),
  // };

  // const transfer = await FLW_services.transferMoney(payload);
  // if (transfer.status == "error")
  //   return next(new ErrorResponse(transfer.message, 403));
  // // const transfer = await FLW_services.runTF(details);
  // console.log(
  //   "🚀 ~ file: utils.controller.js:934 ~ postCashoutVoucherController:asyncHandler ~ transfer:",
  //   transfer
  // );

  // if (!transfer) {
  //   return res.status(400).send({
  //     success: false,
  //     message: "Transfer was not successful.",
  //   });
  // }

  // Good ol' monnify
  payload = {
    amount: foundVoucher.amountPerVoucher,
    destinationBankCode: bankCode,
    destinationAccountNumber: accountNumber,
    destinationAccountName: fullName,
    tx_ref: transREf,
  };

  // const token = await monnify.obtainAccessToken();
  const token = await monnify.obtainSpikkAccessToken();
  const withdrawMoney = await monnify.withdraw(payload, token);
  console.log(
    "🚀 ~ file: utils.controller.js:720 ~ postCashoutVoucherController:asyncHandler ~ withdrawMoney:",
    withdrawMoney
  );

  if (withdrawMoney?.status !== "SUCCESS") {
    return res.status(400).send({
      success: false,
      message: "Transfer was not successful.",
    });
  }

  sendMail(winnerMailOptions);
  await foundVoucher.save();

  // Save winner details
  const winner = new winnerModel({
    fullName,
    email,
    claimedVoucherCode: voucherCode,
    bankCode,
    accountNumber,
  });
  await winner.save();

  return res.status(200).send({
    success: true,
    data: {
      voucher: foundVoucher,
      winner,
      // details: transfer,
      details: withdrawMoney,
    },
    message: "Claimed Coupon from Voucher successfully.",
  });
});

// ************* //
const getAllAirtimeBillersController = asyncHandler(async (req, res, next) => {
  try {
    const billers = await FLW_services.getAirtimeBillers();
    return res.status(200).send({
      success: true,
      data: {
        billers: billers,
      },
      message: "Billers fetched successflly",
    });
  } catch (err) {
    console.log("🚀 ~ getAllAirtimeBillersController ~ err:", err);
    return res.status(500).send({
      success: false,
      message: "Couldn't fetch billers",
      errMessage: err,
    });
  }
});

const getBillInformationController = asyncHandler(async (req, res, next) => {
  try {
    const { biller_code } = req.query;
    const bill = await FLW_services.getBillInformation(biller_code);
    return res.status(200).send({
      success: true,
      data: {
        bill: bill,
      },
      message: "Bill information fetched successflly",
    });
  } catch (err) {
    console.log("🚀 ~ getAllAirtimeBillController ~ err:", err);
    return res.status(500).send({
      success: false,
      message: "Couldn't fetch bill information",
      errMessage: err,
    });
  }
});

// cash voucher as airtime
const postCashVoucherAsAirtimeController = asyncHandler(
  async (req, res, next) => {
    const {
      fullName,
      email,
      phone_number,
      voucherCode,
      biller_code,
      item_code,
    } = req.body;

    const body = { ...req.body };
    console.log("🚀 ~ postCashVoucherAsAirtimeController ~ body:", body);

    // // Run Hapi/Joi validation
    const { error } = await cashoutVoucherAsAirtimeValidation.validateAsync(
      body
    );
    if (error) {
      return res.status(400).send({
        success: false,
        message: "Validation failed",
        errMessage: error.details[0].message,
      });
    }

    // find voucher using voucherCode
    const foundVoucher = await voucherModel.findOne({
      // specialKey: voucherCode.slice(0, 11),
      specialKey: `${voucherCode.split("-")[0]}-${voucherCode.split("-")[1]}`,
    });

    console.log(
      "🚀 ~ postCashVoucherAsAirtimeController ~ foundVoucher:",
      foundVoucher
    );

    if (!foundVoucher) {
      return res.status(400).send({
        success: false,
        message: "This coupon does not exist, please try another.",
      });
    }

    let matchingCoupon;

    // search voucher coupons for matching code
    foundVoucher.voucherCoupons.map((item) => {
      if (item.couponCode === voucherCode) {
        if (item.status === "cashed") {
          return res.status(400).send({
            success: false,
            message: "This coupon has already been claimed, please try another",
          });
        }
        matchingCoupon = item;
        // remove coupon from array if found so we can add it later after editing
        // foundVoucher.voucherCoupons.pop(item);
      }
    });

    if (!matchingCoupon) {
      return res.status(400).send({
        success: false,
        message: "This coupon does not exist, please try another.",
      });
    }

    const time = moment().format("yy-MM-DD hh:mm:ss");

    // Edit coupon details then add to array
    matchingCoupon.status = "cashed";
    matchingCoupon.cashedBy = fullName;
    matchingCoupon.cashedDate = time.split(" ")[0];
    matchingCoupon.cashedTime = time.split(" ")[1];

    const index = foundVoucher.voucherCoupons.indexOf(matchingCoupon);

    foundVoucher.voucherCoupons.splice(index, 1, matchingCoupon);

    // Add every other needed calculation stuff then save
    foundVoucher.totalCashedAmount =
      parseInt(foundVoucher.totalCashedAmount) +
      parseInt(foundVoucher.amountPerVoucher);

    foundVoucher.vouchersCashed = parseInt(foundVoucher.vouchersCashed) + 1;
    foundVoucher.cashedPercentage = (
      (parseInt(foundVoucher.vouchersCashed) /
        parseInt(foundVoucher.totalNumberOfVouchers)) *
      (100 / 1)
    ).toFixed(2);

    // Send mail to Voucher creator that <<fullName>> just cashed their voucher
    // find user Email
    const creator = await userModel.findOne({ _id: foundVoucher.userId });

    // Send email to Voucher creator
    const mailOptions = {
      to: creator.email,
      subject: "Voucher Claim Mail",
      html: voucherClaimMail(
        fullName,
        voucherCode,
        creator.name,
        foundVoucher.title,
        foundVoucher.amountPerVoucher
      ),
    };

    // Send email to Voucher winner
    const winnerMailOptions = {
      to: email,
      subject: "Voucher Claim Mail",
      html: winnerVoucherClaimMail(
        fullName,
        voucherCode,
        foundVoucher.title,
        foundVoucher.amountPerVoucher
      ),
    };

    const purchaseDetails = {
      country: "NG",
      customer_id: phone_number,
      amount: foundVoucher.amountPerVoucher,
      reference: `${tx_ref.get_Tx_Ref()}`,
    };

    const customerInfo = {
      item_code,
      biller_code,
      phone_number,
    };

    const validateCustomerInfo = await FLW_services.validateCustomerInfo(
      customerInfo
    );

    if (validateCustomerInfo.response_message !== "Successful") {
      return res.status(400).send({
        success: false,
        message: "Couldn't validate details",
      });
    }

    const buyAirtime = await FLW_services.buyAirtime(
      customerInfo,
      purchaseDetails
    );

    console.log("🚀 ~ buyAirtime:", buyAirtime);

    if (buyAirtime.status === "error") {
      return res.status(400).send({
        success: false,
        message: "Airtime purchase was not successful.",
        error: buyAirtime.message,
      });
    }

    sendMail(mailOptions);
    sendMail(winnerMailOptions);
    await foundVoucher.save();

    // Save winner details
    const winner = new winnerModel({
      fullName,
      email,
      claimedVoucherCode: voucherCode,
      phone_number,
    });
    await winner.save();

    return res.status(200).send({
      success: true,
      data: {
        voucher: foundVoucher,
        winner,
        details: buyAirtime,
      },
      message: "Cashed voucher as airtime successfully.",
    });
  }
);

// Fetch all banks in Nigeria {{FOR FLUTTERWAVE}}
const getAllBanksMonnifyController = asyncHandler(async (req, res, next) => {
  //   const options = {
  //     timeout: 1000 * 60,
  //     headers: {
  //       "content-type": "application/json",
  //       Authorization: `Bearer ${FLW_secKey}`,
  //     },
  //   };

  try {
    console.log("Get all banks first ping");
    const token = await monnify.obtainAccessToken();
    const banks = await monnify.getBanks(token);
    // console.log(
    //   "🚀 ~ file: utils.controller.js:685 ~ getAllBanksController:asyncHandler ~ banks:",
    //   banks
    // );

    // const response = await axios.get(`${baseURL}/banks/NG`, options);
    // console.log(
    //   "🚀 ~ file: utils.controller.js:470 ~ getAllBanksController:asyncHandler ~ response:",
    //   response
    // );
    return res.status(200).send({
      success: true,
      data: {
        banks: banks,
        // banks: response.data.data,
      },
      message: "Banks fetched successflly",
    });
  } catch (err) {
    console.log(
      "🚀 ~ file: utils.controller.js:453 ~ getAllBanksController:asyncHandler ~ err:",
      err
    );
    return res.status(500).send({
      success: false,
      message: "Couldn't fetch banks",
      errMessage: err,
    });
  }
});

// Fetch all banks in Nigeria {{FOR FLUTTERWAVE}}
// getAllBanksController: asyncHandler(async (req, res, next) => {
//   const options = {
//     timeout: 1000 * 60,
//     headers: {
//       "content-type": "application/json",
//       Authorization: `Bearer ${FLW_secKey}`,
//     },
//   };

//   try {
//     const response = await axios.get(`${baseURL}/banks/NG`, options);
//     console.log(
//       "🚀 ~ file: utils.controller.js:470 ~ getAllBanksController:asyncHandler ~ response:",
//       response
//     );
//     return res.status(200).send({
//       success: true,
//       data: {
//         banks: response.data.data,
//       },
//       message: "Banks fetched successflly",
//     });
//   } catch (err) {
//     console.log(
//       "🚀 ~ file: utils.controller.js:453 ~ getAllBanksController:asyncHandler ~ err:",
//       err
//     );
//     return res.status(500).send({
//       success: false,
//       message: "Couldn't fetch banks",
//       errMessage: err,
//     });
//   }
// }),

// Contact us
const postContactUsController = asyncHandler(async (req, res, next) => {
  const { name, email, message } = req.body;
  try {
    const contact = new contactModel({
      name,
      email,
      message,
    });

    // Send email
    const mailOptions = {
      to: process.env.MAIL_USER,
      subject: "Contact us mail",
      html: contactUsMail(name, email, message),
    };

    sendMail(mailOptions);
    await contact.save();

    return res.status(200).send({
      success: true,
      message: "Message sent successflly",
    });
  } catch (err) {
    console.log(
      "🚀 ~ file: utils.controller.js:731 ~ postContactUsController:asyncHandler ~ err:",
      err
    );
    return res.status(400).send({
      success: false,
      message: "Couldn't process request",
      errMessage: err,
    });
  }
});

//handle Flw callback
const handleFlwCallback = asyncHandler(async (req, res) => {
  console.log(req.body);

  res.status(200).json({
    success: true,
    message: "webhook called successfully",
  });
});

// Get all transactions
const getAllTransactionsController = asyncHandler(async (req, res) => {
  const {
    userId,
    page = 1,
    limit = 100000,
    status,
    type,
    minAmount,
    maxAmount,
    fromDate,
    toDate,
  } = req.query;
  // console.log("🚀 ~ getAllTransactionsController ~ req.query:", req.query);

  // console.log("🚀 ~ getAllTransactionsController ~ userId:", userId);

  // Initialize query object
  let query = { userId: userId };

  // Add filters to the query
  if (status) query.status = status;
  if (type) query.type = type;
  if (minAmount)
    query.amount = { ...query.amount, $gte: parseFloat(minAmount) };
  if (maxAmount)
    query.amount = { ...query.amount, $lte: parseFloat(maxAmount) };
  // if (fromDate)
  //   query.createdAt = { ...query.createdAt, $gte: new Date(fromDate) };
  // if (toDate) query.createdAt = { ...query.createdAt, $lte: new Date(toDate) };
  if (fromDate)
    query.createdAt = {
      ...query.createdAt,
      $gte: new Date(fromDate),
    };
  if (toDate)
    query.createdAt = {
      ...query.createdAt,
      $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
    };

  // Pagination options
  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;

  // Fetch transactions with filters, pagination, and sorting by most recent
  const transactions = await transactionModel
    .find(query)
    .sort({ createdAt: -1 }) // Sort by most recent first
    .skip(skip)
    .limit(pageSize);

  // Total transactions count for pagination
  const totalTransactions = await transactionModel.countDocuments(query);

  // If no transactions are found
  if (!transactions || transactions.length === 0) {
    return res.status(404).send({
      success: false,
      message: "No transactions found",
      data: [],
    });
  }

  // Return the paginated and filtered transactions
  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      total: totalTransactions,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(totalTransactions / pageSize),
    },
    message: "Fetched transactions successfully",
  });
});

// const getAllTransactionsController = asyncHandler(async (req, res) => {
//   const { userId } = req.query;
//   console.log("🚀 ~ getAllTransactionsController ~ userId:", userId);

//   const transactions = await transactionModel.find({ userId: userId });

//   if (!transactions) {
//     return res.status(400).send({
//       success: false,
//       message: "No transaction found",
//     });
//   }

//   res.status(200).json({
//     success: true,
//     data: transactions,
//     message: "fetched all transactions successfully",
//   });
// });

// Get one transaction
const getOneTransactionController = asyncHandler(async (req, res) => {
  const { userId, transactionId } = req.query;

  const transaction = await transactionModel.findOne({
    _id: transactionId,
    userId: userId,
  });
  console.log(
    "🚀 ~ file: utils.controller.js:1183 ~ getOneTransactionController:asyncHandler ~ transaction:",
    transaction
  );

  if (!transaction) {
    return res.status(400).send({
      success: false,
      message: "Transaction not found",
    });
  }

  res.status(200).json({
    success: true,
    data: transaction,
    message: "fetched transaction successfully",
  });
});

// const getOneGuestTransactionController = asyncHandler(async (req, res) => {
//   const { userId, transactionId } = req.query;

//   const transaction = await transactionModel.findOne({
//     _id: transactionId,
//     userId: userId,
//   });
//   console.log(
//     "🚀 ~ file: utils.controller.js:1183 ~ getOneTransactionController:asyncHandler ~ transaction:",
//     transaction
//   );

//   if (!transaction) {
//     return res.status(400).send({
//       success: false,
//       message: "Transaction not found",
//     });
//   }

//   res.status(200).json({
//     success: true,
//     data: transaction,
//     message: "fetched transaction successfully",
//   });
// });

// Crowd Funding
const getCategories = asyncHandler(async (req, res, next) => {
  const categories = ["Birthday", "Wedding", "Anniversary", "Baby shower", "Graduation", "Housewarming", "Holiday", "Gift", "Thank You", "Get Well Soon", "Engagement", "Corporate Gifting", "Charity/Donation", "Travel Fund", "Party/Event", "Special Occasion", "Honeymoon", "Retirement", "Bridal Shower", "Appreciation", "others"];
  return res.status(200).json({
    success: true,
    message: "Categories fetched successfully",
    categories: categories,
  });
});

// const getUserLinks = asyncHandler(async (req, res, next) => {
//   const { page = 1, pageSize = 50, ...rest } = req.query;

//   console.log(
//     "🚀 ~ file: utils.controller.js:1226 ~ getUserLinks:asyncHandler ~ req.user:",
//     req.user.linkId
//   );
//   const links = await linkModel
//     .find({ userLinkId: req.user.linkId, isDeleted: false })
//     .select("-userLinkId")
//     .skip(pageSize * (page - 1))
//     .limit(pageSize);
//   return res.status(200).json({
//     success: true,
//     message: "Available Links fetched successfully",
//     links: links,
//   });
// });

// const getUserLinks = asyncHandler(async (req, res, next) => {
//   const { page = 1, pageSize = 50, ...rest } = req.query;

//   console.log(
//     "🚀 ~ file:  utils.controller.js:1226 ~ getUserLinks:asyncHandler ~ req.user:",
//     req.user.linkId
//   );

//   const links = await linkModel
//     .find({ userLinkId: req.user.linkId, isDeleted: false })
//     .select("-userLinkId")
//     .sort({ createdAt: -1 }) // Sorting by date in descending order
//     .skip(pageSize * (page - 1))
//     .limit(pageSize);

//   return res.status(200).json({
//     success: true,
//     message: "Available Links fetched successfully",
//     links: links,
//   });
// });

// @desc    Make Payment via Link
// @route   /link/pay
// @access  Public
const postCrowdFundingController = asyncHandler(async (req, res, next) => {
  // const { amount, name, email, link } = req.body;
  const { name, email, link, amount } = req.body;


  // const findLink = await linkModel.findById(link);
  const findLink = await linkModel.findOne({ link });
  console.log("LINK: ", findLink);
  if (!findLink) return next(new ErrorResponse("Invalid Link", 404));
  const user = await userModel.findOne({ linkId: findLink.userLinkId });
  if (!user) return next("Invalid Link", 404);
  const useLinkId = new mongoose.Types.ObjectId(findLink.id);

  const setAmount = req.body.amount ?? findLink.amount;

  // Ensure findLink.amount is a number (default to 0 if null)
  const existingAmount = Number(findLink.amount) || 0;
  const newAmount = Number(amount) || 0;

  // Calculate the final amount (existing + new)
  const finalSetAmount = existingAmount + newAmount;

  if (!findLink.amount || findLink.amount < finalSetAmount) {
    await linkModel.findByIdAndUpdate(useLinkId, { amount: finalSetAmount });
  }
  // const setAmount = findLink.amount;

  if (Number(finalSetAmount) > Number(process.env.MAXIMUM_AMOUNT_PER_TRANSACTION))
    return next(
      new ErrorResponse(
        `Transaction limit per transaction is ${process.env.MAXIMUM_AMOUNT_PER_TRANSACTION}k`,
        401
      )
    );

  const { error } = await Validator.payToLink.validateAsync({
    ...req.body,
    amount: finalSetAmount,
  });
  if (error) {
    return next(new ErrorResponse(error.message, 400));
  }

  // // const findLink = await linkModel.findById(link);
  // const findLink = await linkModel.findOne({ link });
  // console.log("LINK: ", findLink);
  // if (!findLink) return next(new ErrorResponse("Invalid Link", 404));
  // const user = await userModel.findOne({ linkId: findLink.userLinkId });
  // if (!user) return next("Invalid Link", 404);
  // const useLinkId = new mongoose.Types.ObjectId(findLink.id);
  const dailyTransactions = await transactionModel.aggregate([
    {
      $match: {
        name: name, // Replace "Specific Name" with the desired name
        link: useLinkId, // Replace "Specific Link" with the desired link
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" }, // Replace "fieldName" with the actual field name you want to sum
      },
    },
  ]);
  const totalSum =
    dailyTransactions.length > 0 ? dailyTransactions[0].totalAmount : 0;
  if (
    Number(totalSum) + Number(finalSetAmount) >
    Number(process.env.MAXIMUM_AMOUNT_PER_DAY) ||
    Number(totalSum) + Number(amount) > finalSetAmount
  )
    return next(
      new ErrorResponse(
        `Maximum transaction limit per day of ${process.env.MAXIMUM_AMOUNT_PER_DAY} cannot be exceeded`,
        401
      )
    );
  const transREf = await tx_ref.get_Tx_Ref();

  const payload = {
    tx_ref: transREf,
    amount: setAmount,
    currency: "NGN",
    payment_options: "card",
    // redirect_url: "https://www.usepays.co/payment/depositecompleted",
    redirect_url: "https://www.usepays.co/dashboard/transactions",
    customer: {
      email: email,
      phonenumber: " ",
      name: name,
    },
    meta: {
      customer_id: transREf,
    },
    customizations: {
      title: "Pays",
      description: "Pay with card",
      logo: "#",
    },
  };

  const response = await FLW_services.initiateTransaction(payload);
  // paymentReference
  const transaction = await new transactionModel({
    tx_ref: transREf,
    paymentReference: transREf,
    transactionReference: transREf,
    userId: user.id,
    amount: finalSetAmount,
    currency: "NGN",
    type: "credit",
    status: "initiated",
  });

  await transaction.save();

  // // Good Ol monnify
  // const payload = {
  //   amount,
  //   name,
  //   email,
  //   description: "Crowd Funding Account",
  //   tx_ref: transREf,
  // };

  // const token = await monnify.obtainAccessToken();
  // const makePayment = await monnify.initializePaymentForLink(payload, token);

  // const transaction = new transactionModel({
  //   tx_ref: transREf,
  //   paymentReference: makePayment.paymentReference,
  //   transactionReference: makePayment.transactionReference,
  //   userId: user.id,
  //   amount,
  //   currency: findLink.currency,
  //   type: "credit",
  //   status: "initiated",
  //   name,
  //   link: findLink.id,
  //   fundingType: "crowdFunding",
  // });

  // await transaction.save();
  return res.status(200).send({
    success: true,
    data: response,
    message: "Payment Initiated",
    transaction: transaction,
  });
});

// const postCrowdFundingController = asyncHandler(async (req, res, next) => {
//   // const { amount, name, email, link } = req.body;
//   // const { name, email, link } = req.body;
//   const { link } = req.query;
//   console.log("Query: ", link);

//   // const findLink = await linkModel.findById(link);
//   const findLink = await linkModel.findOne({ link });
//   console.log("LINK: ", findLink);
//   if (!findLink) return next(new ErrorResponse("Invalid Link", 404));
//   const user = await userModel.findOne({ linkId: findLink.userLinkId });
//   // console.log("User: ", user);
//   if (!user) return next("Invalid Link", 404);
//   const useLinkId = new mongoose.Types.ObjectId(findLink.id);

//   const { amount } = findLink;
//   const { email, name } = user;

//   if (Number(amount) > Number(process.env.MAXIMUM_AMOUNT_PER_TRANSACTION))
//     return next(
//       new ErrorResponse(
//         `Transaction limit per transaction is ${process.env.MAXIMUM_AMOUNT_PER_TRANSACTION}k`,
//         401
//       )
//     );
//     const verify = { email, amount, name, link }
//   const { error } = await Validator.payToLink.validateAsync(verify);
//   if (error) {
//     return next(new ErrorResponse(error.message, 400));
//   }

//   // // const findLink = await linkModel.findById(link);
//   // const findLink = await linkModel.findOne({ link });
//   // console.log("LINK: ", findLink);
//   // if (!findLink) return next(new ErrorResponse("Invalid Link", 404));
//   // const user = await userModel.findOne({ linkId: findLink.userLinkId });
//   // if (!user) return next("Invalid Link", 404);
//   // const useLinkId = new mongoose.Types.ObjectId(findLink.id);
//   const dailyTransactions = await transactionModel.aggregate([
//     {
//       $match: {
//         name: name, // Replace "Specific Name" with the desired name
//         link: useLinkId, // Replace "Specific Link" with the desired link
//       },
//     },
//     {
//       $group: {
//         _id: null,
//         totalAmount: { $sum: "$amount" }, // Replace "fieldName" with the actual field name you want to sum
//       },
//     },
//   ]);
//   const totalSum =
//     dailyTransactions.length > 0 ? dailyTransactions[0].totalAmount : 0;
//   if (
//     Number(totalSum) + Number(amount) >
//       Number(process.env.MAXIMUM_AMOUNT_PER_DAY) ||
//     Number(totalSum) + Number(amount) > findLink.amount
//   )
//     return next(
//       new ErrorResponse(
//         `Maximum transaction limit per day of ${process.env.MAXIMUM_AMOUNT_PER_DAY} cannot be exceeded`,
//         401
//       )
//     );
//   const transREf = await tx_ref.get_Tx_Ref();

//   const payload = {
//     tx_ref: transREf,
//     amount: findLink.amount,
//     currency: "NGN",
//     payment_options: "card",
//     // redirect_url: "https://www.usepays.co/payment/depositecompleted",
//     redirect_url: "https://www.usepays.co/",
//     customer: {
//       email: email,
//       phonenumber: " ",
//       name: name,
//     },
//     meta: {
//       customer_id: transREf,
//     },
//     customizations: {
//       title: "Pays",
//       description: "Pay with card",
//       logo: "#",
//     },
//   };

//   const response = await FLW_services.initiateTransaction(payload);
//   // paymentReference
//   const transaction = await new transactionModel({
//     tx_ref: transREf,
//     paymentReference: transREf,
//     transactionReference: transREf,
//     userId: user.id,
//     amount,
//     currency: "NGN",
//     type: "credit",
//     status: "initiated",
//   });

//   await transaction.save();

//   // // Good Ol monnify
//   // const payload = {
//   //   amount,
//   //   name,
//   //   email,
//   //   description: "Crowd Funding Account",
//   //   tx_ref: transREf,
//   // };

//   // const token = await monnify.obtainAccessToken();
//   // const makePayment = await monnify.initializePaymentForLink(payload, token);

//   // const transaction = new transactionModel({
//   //   tx_ref: transREf,
//   //   paymentReference: makePayment.paymentReference,
//   //   transactionReference: makePayment.transactionReference,
//   //   userId: user.id,
//   //   amount,
//   //   currency: findLink.currency,
//   //   type: "credit",
//   //   status: "initiated",
//   //   name,
//   //   link: findLink.id,
//   //   fundingType: "crowdFunding",
//   // });

//   // await transaction.save();
//   return res.status(200).send({
//     success: true,
//     data: response,
//     message: "Payment Initiated",
//     transaction: transaction,
//     userId: user?.id,
//   });
// });

// @desc    Get Crowd Funded Transactions
// @route   /link/transactions/:linkId
// @access  Private
const getCrowdFundedTransactionsPaidViaLink = asyncHandler(
  async (req, res, next) => {
    const { page = 1, pageSize = 50, ...rest } = req.query;
    const link = await linkModel.findById(req.params.linkId);
    if (!link) return next(new ErrorResponse("Invalid Link", 404));
    const transactions = await transactionModel
      .find({
        fundingType: "crowdFunding",
        link: req.params.linkId,
      })
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .select("-flw_ref -userId -link");
    return res.status(200).json({
      success: true,
      message: "Transaction have been successfully retrieved",
      transactions: transactions,
    });
  }
);

// @desc    Get Link details
// @route   /links/:linkId
// @access  Public
const getLinkDetails = asyncHandler(async (req, res, next) => {
  const link = await linkModel.findById(req.params.linkId);
  if (!link) return next(new ErrorResponse("Invalid Link", 404));
  const user = await userModel
    .findOne({ linkId: link.userLinkId })
    .select("name email phone companyLogo role");
  return res.status(200).json({
    success: true,
    message: "Link has been successfully retrieved",
    link,
    user,
  });
});

// **************** //
// **************** //
// **************** //
// PAYMENT LINKS //
// **************** //
// **************** //
// **************** //

// @desc    Create Payment Link
// @route   /link/create
// @access  Private
const postCreateCrowdFundingLink = asyncHandler(async (req, res, next) => {
  const {
    category,
    title,
    description,
    link,
    linkExpiry = null,
    amount,
  } = req.body;
  if (Number(amount) > 200000)
    return next(new ErrorResponse("Amount is larger than the maximum", 401));
  const { error } = await Validator.createLink.validateAsync(req.body);
  if (error) {
    return next(new ErrorResponse(error.message, 400));
  }
  let user = req.user;
  if (!user.linkId) {
    const linkId = uuidv4();
    user = await userModel.findByIdAndUpdate(
      req.user.id,
      { linkId },
      { new: true }
    );
  }
  const checkName = await linkModel.findOne({
    title,
    userLinkId: user.linkId,
  });
  if (checkName)
    return next(new ErrorResponse("Link with this title already exists", 401));
  const checkLink = await linkModel.findOne({ link });
  if (checkLink)
    return next(
      new ErrorResponse(
        "Link has already been taken. Please choose another",
        401
      )
    );
  const newLink = await new linkModel({
    title,
    category,
    link,
    description,
    linkExpiry,
    amount,
    currency: "NGN",
    userLinkId: user.linkId,
  });
  await newLink.save();
  const findLink = await linkModel.findById(newLink.id).select("-userLinkId");
  const appendLink = `${link}/${newLink.id}`;
  newLink.link = appendLink;
  await newLink.save();
  return res.status(201).json({
    success: true,
    message: "Link generated successfully",
    link: findLink,
  });
});

const getUserLinks = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    pageSize = 50,
    sortBy = "date",
    status,
    minAmount,
    maxAmount,
    fromDate,
    toDate,
    ...rest
  } = req.query;

  const currentDate = new Date(); // Get the current date

  let query = { userLinkId: req.user.linkId, isDeleted: false }; // Base query

  // Add status filter logic
  if (status === "expired") {
    query.linkExpiry = { $lt: currentDate }; // Expired links
  } else if (status === "active") {
    query.linkExpiry = { $gte: currentDate }; // Active links
  }

  // Add amount range filter logic
  if (minAmount || maxAmount) {
    query.amount = {};
    if (minAmount) query.amount.$gte = Number(minAmount); // Minimum amount
    if (maxAmount) query.amount.$lte = Number(maxAmount); // Maximum amount
  }

  // Add date range filter logic
  // if (from || to) {
  //   query.createdAt = {};
  //   if (from) query.createdAt.$gte = new Date(from); // From date
  //   if (to) query.createdAt.$lte = new Date(to); // To date
  // }

  if (fromDate)
    query.createdAt = {
      ...query.createdAt,
      $gte: new Date(fromDate),
    };
  if (toDate)
    query.createdAt = {
      ...query.createdAt,
      $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
    };

  // Define sort logic
  let sortCriteria;
  if (sortBy === "amount") {
    sortCriteria = { amount: -1 }; // Sort by amount (descending)
  } else if (sortBy === "date") {
    sortCriteria = { createdAt: -1 }; // Sort by date (descending)
  } else {
    sortCriteria = {}; // Default: no sorting
  }

  // Fetch links with pagination
  const links = await linkModel
    .find(query)
    .select("-userLinkId")
    .sort(sortCriteria)
    .skip(pageSize * (page - 1))
    .limit(pageSize);

  return res.status(200).json({
    success: true,
    message: "Available Links fetched successfully",
    links: links,
  });
});

const getPaymentLinkById = asyncHandler(async (req, res, next) => {
  const { id } = req.query;

  try {
    const link = await linkModel.findById(id);

    if (!link) {
      return next(new ErrorResponse("Payment link not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Payment link retrieved successfully",
      link,
    });
  } catch (error) {
    return next(new ErrorResponse("Error fetching payment link", 500));
  }
});

const deletePaymentLinkById = asyncHandler(async (req, res, next) => {
  const { id } = req.query;

  try {
    const link = await linkModel.findById(id);

    if (!link) {
      return next(new ErrorResponse("Payment link not found", 404));
    }

    await link.remove();

    return res.status(200).json({
      success: true,
      message: "Payment link deleted successfully",
    });
  } catch (error) {
    return next(new ErrorResponse("Error deleting payment link", 500));
  }
});

const webhook = asyncHandler(async (req, res, next) => {
  try {
    const paymentReference = req.body.eventData.paymentReference;
    const transactionReference = req.body.eventData.transactionReference;

    const transaction = await transactionModel.findOne({
      paymentReference,
      transactionReference,
    });

    if (!transaction) {
      return res.status(400).send({
        success: false,
        message: "transaction not found.",
      });
    }

    if (req.body.eventData.paymentStatus !== "PAID")
      return next(
        new ErrorResponse("Something went wrong with the transaction", 400)
      );
    if (transaction.status === "successful") {
      return res.status(400).send({
        success: false,
        message: "Failed: Possible duplicate Transaction",
      });
    }

    // update transaction
    transaction.status = "successful";
    await transaction.save();

    // find user and update walletBalance
    const user = await userModel.findOne({ _id: transaction.userId });

    if (!user) {
      return res.status(400).send({
        success: false,
        message: "User not found",
      });
    }

    user.walletBalance = user.walletBalance + transaction.amount;
    await user.save();
  } catch (error) {
    console.log("Check: ", err);
    // transaction.status = verify.paymentStatus;
    // await transaction.save();
    // return res.status(400).send({
    //   success: false,
    //   message: "Transaction was not successful",
    //   errMessage: verify,
    // });
  }
  return res.status(200).json({ success: true, data: req.body });
});

const transferWebhook = asyncHandler(async (req, res, next) => {
  try {
    const paymentReference = req.body.eventData.paymentReference;
    const transactionReference = req.body.eventData.transactionReference;

    const transaction = await transactionModel.findOne({
      paymentReference,
      transactionReference,
    });

    if (!transaction) {
      return res.status(400).send({
        success: false,
        message: "transaction not found.",
      });
    }

    if (req.body.eventData.paymentStatus !== "PAID")
      return next(
        new ErrorResponse("Something went wrong with the transaction", 400)
      );
    if (transaction.status === "successful") {
      return res.status(400).send({
        success: false,
        message: "Failed: Possible duplicate Transaction",
      });
    }

    // update transaction
    transaction.status = "successful";
    await transaction.save();

    // find user and update walletBalance
    const user = await userModel.findOne({ _id: transaction.userId });

    if (!user) {
      return res.status(400).send({
        success: false,
        message: "User not found",
      });
    }

    user.walletBalance = user.walletBalance - transaction.amount;
    await user.save();
  } catch (error) {
    console.log("Check: ", err);
    // transaction.status = verify.paymentStatus;
    // await transaction.save();
    // return res.status(400).send({
    //   success: false,
    //   message: "Transaction was not successful",
    //   errMessage: verify,
    // });
  }
  return res.status(200).json({ success: true, data: req.body });
});
// postGenerateCrowdFundingLink: asyncHandler(async(req, res, next) => {
//   const {link} = req.body
//   const user = await userModel.findByIdAndUpdate(req.user.id, {})
// })

// Homepage Stats
const getHomepageStats = asyncHandler(async (req, res, next) => {
  const allUsers = await userModel.find();
  const allVouchers = await voucherModel.find();
  let amountCashed = 0;
  let voucherCashed = 0;

  allVouchers.map((voucher) => {
    amountCashed = amountCashed + voucher.totalCashedAmount;

    const cashedCoupons = voucher.voucherCoupons.filter(
      (coupon) => coupon.status === "cashed"
    );
    voucherCashed += cashedCoupons.length;
  });
  // console.log("🚀 ~ getHomepageStats ~ allVouchers:", allVouchers);
  return res.status(200).json({
    success: true,
    message: "Link has been successfully retrieved",
    data: {
      users: allUsers.length * 12,
      vouchersCreated: allVouchers.length * 21,
      amountCashed: amountCashed * 25,
      voucherCashed: voucherCashed * 35,
    },
  });
});

// Get IP address
const getIPAddress = async () => {
  const options = {
    timeout: 1000 * 60,
    headers: {
      "content-type": "application/json",
    },
  };
  console.log("GET IP");
  try {
    const response = await axios.get(
      "https://api64.ipify.org?format=json",
      options
    );
    console.log({ IP: response.data.ip });
    if (!response) {
      return res.status(400).send({
        success: false,
        message: "IP address not found",
      });
    }
    return response.data;
  } catch (error) {
    console.log("Error fetching IP address: ", error);
    return null;
  }
};

module.exports = {
  getAllBanksMonnifyController,
  getAllTransactionsController,
  getCategories,
  getLinkDetails,
  getOneTransactionController,
  getPingController,
  getUserLinks,
  getVerifyController,
  handleFlwCallback,
  postFundWalletController,
  postCashoutVoucherController,
  getAllAirtimeBillersController,
  getBillInformationController,
  postCashVoucherAsAirtimeController,
  postCreateCrowdFundingLink,
  postCreateVoucherController,
  putUpdateVoucherController,
  getCrowdFundedTransactionsPaidViaLink,
  postCrowdFundingController,
  postContactUsController,
  postFindVoucherController,
  postWithdrawFromWalletController,
  transferWebhook,
  webhook,
  verifyWalletFundWebhook,
  getHomepageStats,
  getPaymentLinkById,
  deletePaymentLinkById,
  getIPAddress,
  postCreateVoucherDraftController,
  getOneVoucherDraftController,
  getAllVoucherDraftsController,
  postGuestFundWalletController,
  postCreateGuestVoucherController,
  getVerifyGuestFundController,
  getFindGuestVoucherController,
  getFindGuestTransactionController,
  putUpdateGuestVoucherController
};
