// Dependecies
const moment = require("moment");

// Models
const voucherModel = require("../models/voucher.model");
const transactionModel = require("../models/transaction.model");

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
const userModel = require("../models/user.model");

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
            redirect_url: "https://topapp.ng/utility/verify",
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

    // create voucher
    postCreateVoucherController: asyncHandler(async(req, res, next) => {
        const {
            title,
            description,
            voucherKey,
            totalNumberOfVouchers,
            amountPerVoucher,
            totalAmount,
        } = req.body;

        // Do simple maths to know if numbers match
        if (req.user.walletBalance < totalNumberOfVouchers * amountPerVoucher) {
            return res.status(400).send({
                success: false,
                message: "Insufficient wallet balance, please fund wallet",
            });
        }

        // Do simple maths to know if numbers match again just to be safe
        if (totalNumberOfVouchers * amountPerVoucher != totalAmount) {
            return res.status(400).send({
                success: false,
                message: "Error! please check numbers and try again",
            });
        }

        // Check walletBalance before transaction
        if (req.user.walletBalance < totalAmount) {
            return res.status(400).send({
                success: false,
                message: "Insufficient wallet balance, please fund wallet",
            });
        }

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

            const voucherCode = `${voucherKey}-${alphabets[rand]}${alphabets[rand3]}${
        alphabets[rand2]
      }-${ref.slice(10, 20)}${alphabets[rand4]}`;

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
        if (error) return res.status(400).send(error.details[0].message);

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

        user.walletBalance = user.walletBalance - totalAmount;
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

    // Cashout voucher
    postCashoutVoucherController: asyncHandler(async(req, res, next) => {
        const { fullName, voucherCode } = req.body;

        const body = {...req.body };

        // Run Hapi/Joi validation
        const { error } = await cashoutVoucherValidation.validateAsync(body);
        if (error) return res.status(400).send(error.details[0].message);

        // find voucher using voucherCode
        const foundVoucher = await voucherModel.findOne({
            voucherKey: voucherCode.slice(0, 3),
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
                // remove coupon from array if found so we can add it later after editing
                foundVoucher.voucherCoupons.pop(item);
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

        foundVoucher.voucherCoupons.push(matchingCoupon);

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

        await foundVoucher.save();

        // Send mail to Voucher creator that <<fullName>> just cashed their voucher

        // find user Email
        const creator = await userModel.findOne({ _id: foundVoucher.userId });

        // Send password to admin's email
        const mailOptions = {
            to: creator.email,
            subject: "Voucher Claim Mail",
            html: voucherClaimMail(
                fullName,
                voucherCode,
                creator.firstName,
                foundVoucher.title
            ),
        };
        sendMail(mailOptions);

        // withdraw money to <<fullName>>

        return res.status(200).send({
            success: true,
            data: {
                voucher: foundVoucher,
            },
            message: "Claimed Coupon from Voucher.",
        });
    }),

    // Fetch all banks in Nigeria {{FOR FLUTTERWAVE}}

};