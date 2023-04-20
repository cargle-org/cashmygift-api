// Dependecies
const moment = require("moment");
const axios = require("axios");
require("dotenv").config();

// Flutterwave stuff
const Flutterwave = require("flutterwave-node-v3");
const baseURL = process.env.FLUTTERWAVE_BASE_URL;
const FLW_pubKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
const FLW_secKey = process.env.FLUTTERWAVE_SECRET_KEY;

// Models
const voucherModel = require("../models/voucher.model");
const transactionModel = require("../models/transaction.model");
const userModel = require("../models/user.model");

// Middlewares
const {
    createVoucherValidation,
    cashoutVoucherValidation,
} = require("../middlewares/validate");
const asyncHandler = require("../middlewares/asyncHandler");
const { uploadImageSingle } = require("../middlewares/cloudinary");
const tx_ref = require("../middlewares/tx_ref");

// Services
const sendMail = require("../services/mailer.services");
const FLW_services = require("../services/flutterwave.services");

// Templates
const voucherClaimMail = require("../templates/voucherClaimMail.templates");
const winnerVoucherClaimMail = require("../templates/winnerVoucherClaimMail.templates");
const winnerModel = require("../models/winner.model");

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

    // Fund wallet
    postFundWalletController: asyncHandler(async(req, res, next) => {
        const { amount } = req.body;

        const currency = "NGN";
        const transREf = await tx_ref.get_Tx_Ref();

        const payload = {
            tx_ref: transREf,
            amount,
            currency,
            payment_options: "card",
            redirect_url: "https://cmg-three.vercel.app/payment/depositecompleted",
            customer: {
                email: req.user.email,
                phonenumber: req.user.phone,
                name: `${req.user.firstName} ${req.user.lastName}`,
            },
            meta: {
                customer_id: req.user._id,
            },
            customizations: {
                title: "CMG",
                description: "Pay with card",
                logo: "#",
            },
        };

        const transaction = await new transactionModel({
            tx_ref: transREf,
            userId: req.user._id,
            amount,
            currency,
            type: "credit",
            status: "initiated",
        });

        await transaction.save();

        const response = await FLW_services.initiateTransaction(payload);

        return res.status(200).send({
            success: true,
            data: {
                response,
            },
            message: "Payment Initiated",
        });
    }),

    // Verify "Fund wallet transaction"
    getVerifyController: asyncHandler(async(req, res, next) => {
        const id = req.query.transaction_id;
        const tx_ref = req.query.tx_ref;

        const verify = await FLW_services.verifyTransaction(id);

        if (verify.status === "successful") {
            const transaction = await transactionModel.findOne({ tx_ref: tx_ref });

            if (!transaction) {
                return res.status(400).send({
                    success: false,
                    message: "Transaction not found",
                });
            }

            if (transaction.status === "successful") {
                return res.status(400).send({
                    success: false,
                    message: "Failed: Possible duplicate Transaction",
                });
            }

            // update transaction
            transaction.status = "successful";
            console.log(
                "🚀 ~ file: utils.controller.js:125 ~ getVerifyController:asyncHandler ~ transaction:",
                transaction
            );
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
        } else {
            return res.status(400).send({
                success: false,
                message: "Transaction was not successful",
            });
        }
    }),

    // Withdraw from wallet
    postWithdrawFromWalletController: asyncHandler(async(req, res, next) => {
        const { amount, bankCode, accountNumber } = req.body;

        // const body = {...req.body };

        // // Run Hapi/Joi validation
        // const { error } = await cashoutVoucherValidation.validateAsync(body);
        // if (error) return res.status(400).send(error.details[0].message);

        // find voucher using voucherCode
        const user = await userModel.findOne({
            _id: req.user._id,
        });
        console.log(
            "🚀 ~ file: utils.controller.js:171 ~ postCashoutVoucherController:asyncHandler ~ user:",
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
        const payload = {
            account_bank: bankCode,
            account_number: accountNumber,
            amount: amount,
            narration: "Withdrawal from CMG.co wallet",
            currency: "NGN",
            callback_url: "https://cmg-three.vercel.app/",
            debit_currency: "NGN",
        };

        const transfer = await FLW_services.transferMoney(payload);
        console.log(
            "🚀 ~ file: utils.controller.js:202 ~ postWithdrawFromWalletController:asyncHandler ~ transfer:",
            transfer
        );

        if (!transfer) {
            return res.status(400).send({
                success: false,
                message: "Transfer was not successful.",
            });
        }

        // remove money from dashboard wallet to it doesn't still appear
        user.walletBalance = user.walletBalance - amount;
        await user.save();

        return res.status(200).send({
            success: true,
            message: `Successfully withdrawn ${amount} from your CMG wallet`,
        });
    }),

    // create voucher
    postCreateVoucherController: asyncHandler(async(req, res, next) => {
        const {
            title,
            description,
            voucherKey,
            totalNumberOfVouchers,
            amountPerVoucher,
        } = req.body;

        const cmgFee = parseInt(totalNumberOfVouchers * 10);
        const totalAmount = parseInt(totalNumberOfVouchers * amountPerVoucher);

        // Do simple maths to know if numbers match
        if (req.user.walletBalance < totalAmount + cmgFee) {
            return res.status(400).send({
                success: false,
                message: "Insufficient wallet balance, please fund wallet",
            });
        }

        // // Do simple maths to know if numbers match again just to be safe
        // if (totalNumberOfVouchers * amountPerVoucher != totalAmount) {
        //     return res.status(400).send({
        //         success: false,
        //         message: "Error! please check numbers and try again",
        //     });
        // }

        // // Check walletBalance before transaction
        // if (req.user.walletBalance < totalAmount) {
        //     return res.status(400).send({
        //         success: false,
        //         message: "Insufficient wallet balance, please fund wallet",
        //     });
        // }

        // Check if voucherKEy already exists
        const foundVoucherKey = await voucherModel.findOne({
            voucherKey: voucherKey,
        });
        if (foundVoucherKey) {
            return res
                .status(400)
                .send("Voucher Key already exists, please try another.");
        }

        let voucherCoupons = [];
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

        // create loop based on number of vouchers
        for (let i = 1; i <= totalNumberOfVouchers; i++) {
            const rand = Math.floor(Math.random() * 48);
            const rand2 = Math.floor(Math.random() * 48);
            const rand3 = Math.floor(Math.random() * 48);
            const rand4 = Math.floor(Math.random() * 48);

            const time = moment().format("yy-MM-DD hh:mm:ss");
            const ref = time.replace(/[\-]|[\s]|[\:]/g, "");

            // const voucherCode = `${voucherKey}-${alphabets[rand]}${alphabets[rand3]}${
            //   alphabets[rand2]
            // }-${ref.slice(10, 20)}${alphabets[rand4]}${rand}${rand3}${
            //   alphabets[rand3]
            // }`;

            const voucherCode = `${voucherKey}-${alphabets[rand]}${alphabets[rand3]}${alphabets[rand2]}-${alphabets[rand4]}${rand}${rand3}${alphabets[rand3]}`;

            voucherCoupons.push({
                couponId: i,
                couponCode: voucherCode,
                status: "pending",
                cashedBy: "No one yet",
                cashedDate: "Not yet",
                cashedTime: "Not yet",
            });

            // const voucherCode1 = `${alphabets[rand]}${alphabets[rand3]}${
            //   alphabets[rand2]
            // }-${ref.slice(10, 20)}-${ref.slice(2, 6)}${alphabets[rand4]}`;
        }

        const body = {...req.body, thumbnail: req.file, voucherCoupons };

        // Run Hapi/Joi validation
        const { error } = await createVoucherValidation.validateAsync(body);
        if (error) {
            return res.status(400).send({
                success: false,
                message: "Validation failed",
                errMessage: error.details[0].message,
            });
        }

        // send image to Cloudinary
        const thumbnail = await uploadImageSingle(req, res, next);

        // create voucher
        const voucher = new voucherModel({
            userId: req.user.id,
            title,
            thumbnail,
            description,
            voucherKey,
            totalNumberOfVouchers,
            amountPerVoucher,
            totalAmount,
            voucherCoupons,
        });
        await voucher.save();

        const user = await userModel.findOne({ _id: req.user._id });
        if (!user) {
            return res.status(400).send({
                success: false,
                message: "Couldn't find user",
            });
        }

        user.walletBalance = user.walletBalance - (totalAmount + cmgFee);
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
    }),

    // find voucher
    postFindVoucherController: asyncHandler(async(req, res, next) => {
        try {
            const { voucherCode } = req.body;

            // find voucher using voucherCode
            const foundVoucher = await voucherModel.findOne({
                voucherKey: voucherCode.slice(0, 5),
            });

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
                        thumbnail: foundVoucher.thumbnail,
                        description: foundVoucher.description,
                        amount: foundVoucher.amountPerVoucher,
                        description: foundVoucher.description,
                        coupon: matchingCoupon,
                    },
                },
                message: "Claimed Coupon from Voucher successfully.",
            });
        } catch (error) {
            console.log(
                "🚀 ~ file: utils.controller.js:430 ~ postFindVoucherController:asyncHandler ~ error:",
                error
            );
            return res.status(400).send({
                success: false,
                message: "Couldn't find voucher.",
            });
        }
    }),

    // Cashout voucher
    postCashoutVoucherController: asyncHandler(async(req, res, next) => {
        const { fullName, email, voucherCode, bankCode, accountNumber } = req.body;

        const body = {...req.body };

        // Run Hapi/Joi validation
        const { error } = await cashoutVoucherValidation.validateAsync(body);
        if (error) {
            return res.status(400).send({
                success: false,
                message: "Validation failed",
                errMessage: error.details[0].message,
            });
        }

        // find voucher using voucherCode
        const foundVoucher = await voucherModel.findOne({
            voucherKey: voucherCode.slice(0, 5),
        });
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
            "🚀 ~ file: utils.controller.js:475 ~ postCashoutVoucherController:asyncHandler ~ index:",
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
        const mailOptions = {
            to: creator.email,
            subject: "Voucher Claim Mail",
            html: voucherClaimMail(
                fullName,
                voucherCode,
                creator.firstName,
                foundVoucher.title,
                foundVoucher.amountPerVoucher
            ),
        };

        // Send email to Voucher winner
        const winnerMailOptions = {
            to: creator.email,
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
            "🚀 ~ file: utils.controller.js:417 ~ postCashoutVoucherController:asyncHandler ~ transREf:",
            transREf
        );

        // withdraw money to <<fullName>>
        const payload = {
            account_bank: bankCode,
            account_number: accountNumber,
            amount: foundVoucher.amountPerVoucher,
            narration: "Voucher Redemption at CMG.co",
            currency: "NGN",
            // reference: transREf,
            // reference: "dfs23fhr7ntg0293039_PMCK",
            callback_url: "https://cmg-three.vercel.app/",
            debit_currency: "NGN",
        };

        const transfer = await FLW_services.transferMoney(payload);
        console.log(
            "🚀 ~ file: utils.controller.js:499 ~ postCashoutVoucherController:asyncHandler ~ transfer:",
            transfer
        );

        if (!transfer) {
            return res.status(400).send({
                success: false,
                message: "Transfer was not successful.",
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
            bankCode,
            accountNumber,
        });
        await winner.save();

        return res.status(200).send({
            success: true,
            data: {
                voucher: foundVoucher,
                transfer,
            },
            message: "Claimed Coupon from Voucher successfully.",
        });
    }),

    // Fetch all banks in Nigeria {{FOR FLUTTERWAVE}}
    getAllBanksController: asyncHandler(async(req, res, next) => {
        const options = {
            timeout: 1000 * 60,
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${FLW_secKey}`,
            },
        };

        try {
            const response = await axios.get(`${baseURL}/banks/NG`, options);
            console.log(
                "🚀 ~ file: utils.controller.js:470 ~ getAllBanksController:asyncHandler ~ response:",
                response
            );
            return res.status(200).send({
                success: true,
                data: {
                    banks: response.data.data,
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
    }),
};