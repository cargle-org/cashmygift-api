// Dependencies
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment");

// Models
const User = require("../models/user.model");
const voucherModel = require("../models/voucher.model");

// Middlewares
const asyncHandler = require("../middlewares/asyncHandler");
const { editProfileValidation } = require("../middlewares/validate");

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

  //   get user
  getUserController: asyncHandler(async (req, res, next) => {
    const { userId } = req.query;

    //   check if user exist
    const user = await User.findOne({ _id: userId });
    console.log(
      "🚀 ~ file: user.controller.js:34 ~ getUserController:asyncHandler ~ user:",
      user
    );

    if (!user) {
      return res.status(400).send({
        success: false,
        message: "user not found.",
      });
    }

    // get all vouchers
    const vouchers = await voucherModel.find({ userId: userId });
    console.log(
      "🚀 ~ file: user.controller.js:49 ~ getUserController:asyncHandler ~ vouchers:",
      vouchers
    );

    let totalVouchers = 0;
    let totalAmountCashed = 0;
    let activeVouchers = 0;
    let cashedVouchers = 0;

    vouchers.map((item) => {
      totalVouchers = totalVouchers + item.totalNumberOfVouchers;
      totalAmountCashed = totalAmountCashed + item.totalCashedAmount;
      item.voucherCoupons.map((voucher) => {
        if (voucher.status === "pending") {
          activeVouchers = activeVouchers + 1;
        } else if (voucher.status === "cashed") {
          cashedVouchers = cashedVouchers + 1;
        }
      });
    });

    user.totalVouchers = totalVouchers;
    user.totalAmountCashed = totalAmountCashed;
    user.activeVouchers = activeVouchers;
    user.cashedVouchers = cashedVouchers;

    await user.save();

    return res.status(200).send({
      success: true,
      data: {
        user: user,
      },
      message: "fetched user successfully.",
    });
  }),

  //   get all user vouchers
  getAllUserVouchersController: asyncHandler(async (req, res, next) => {
    const { userId, from, to, amount, status } = req.query;
    console.log("🚀req.query:", req.query);
    let sortVouchers = [];
    let fromDate = new Date(from);
    let toDate = new Date(to);

    //   check if voucher exist
    const vouchers = await voucherModel.find({ userId: userId });

    if (!vouchers) {
      return res.status(400).send({
        success: false,
        message: "no vouchers found.",
      });
    }

    if ((to && !from) || (!to && from)) {
      return res.status(400).send({
        success: false,
        message: "Date should be a range.",
      });
    }

    // DEFAULT...no needed params? return all vouchers
    if (!from && !to && !amount && !status) {
      return res.status(200).send({
        success: true,
        data: {
          vouchers: vouchers,
        },
        message: "fetched vouchers successfully.",
      });
    }

    // sort by date
    if (from && to && !amount && !status) {
      const dateVouchers = await voucherModel.find({
        userId: userId,
        createdAt: { $gte: fromDate, $lt: toDate },
      });
      console.log("🚀dateVouchers:", dateVouchers);

      return res.status(200).send({
        success: true,
        data: {
          vouchers: dateVouchers,
        },
        message: "fetched vouchers successfully.",
      });
    }

    // sort then by date & amount
    if (from && to && amount && !status) {
      const amountVouchers = await voucherModel.find({
        userId: userId,
        amountPerVoucher: amount,
        createdAt: { $gte: fromDate, $lt: toDate },
      });
      console.log("🚀amountVouchers:", amountVouchers);

      return res.status(200).send({
        success: true,
        data: {
          vouchers: amountVouchers,
        },
        message: "fetched vouchers successfully.",
      });
    }

    // sort by date & status
    if (from && to && status) {
      const statusVouchers = await voucherModel.find({
        userId: userId,
        createdAt: { $gte: fromDate, $lt: toDate },
      });

      statusVouchers.map((item) => {
        item.voucherCoupons.map((voucher) => {
          if (voucher.status === status) {
            const data = {
              title: item.title,
              description: item.description,
              voucherKey: item.voucherKey,
              amount: item.amountPerVoucher,
              couponData: voucher,
            };
            sortVouchers.push(data);
          }
        });
      });

      return res.status(200).send({
        success: true,
        data: {
          vouchers: sortVouchers,
        },
        message: "fetched vouchers successfully.",
      });
    }

    // sort by amount
    if (!from && !to && amount) {
      const amountVouchers = await voucherModel.find({
        userId: userId,
        amountPerVoucher: amount,
      });
      console.log("🚀amountVouchers:", amountVouchers);

      return res.status(200).send({
        success: true,
        data: {
          vouchers: amountVouchers,
        },
        message: "fetched vouchers successfully.",
      });
    }

    // sort by status
    if (!from && !to && status) {
      const statusVouchers = await voucherModel.find({
        userId: userId,
      });

      statusVouchers.map((item) => {
        item.voucherCoupons.map((voucher) => {
          if (voucher.status === status) {
            const data = {
              title: item.title,
              description: item.description,
              voucherKey: item.voucherKey,
              amount: item.amountPerVoucher,
              couponData: voucher,
            };
            sortVouchers.push(data);
          }
        });
      });

      return res.status(200).send({
        success: true,
        data: {
          vouchers: sortVouchers,
        },
        message: "fetched vouchers successfully.",
      });
    }

    // sort by date, amount & status
    if (from && to && amount && status) {
      const statusVouchers = await voucherModel.find({
        userId: userId,
        amountPerVoucher: amount,
        createdAt: { $gte: fromDate, $lt: toDate },
      });

      statusVouchers.map((item) => {
        item.voucherCoupons.map((voucher) => {
          if (voucher.status === status) {
            const data = {
              title: item.title,
              description: item.description,
              voucherKey: item.voucherKey,
              amount: item.amountPerVoucher,
              couponData: voucher,
            };
            sortVouchers.push(data);
          }
        });
      });

      return res.status(200).send({
        success: true,
        data: {
          vouchers: sortVouchers,
        },
        message: "fetched vouchers successfully.",
      });
    }

    // sort by amount & status
    if (from && to && amount && status) {
      const statusVouchers = await voucherModel.find({
        userId: userId,
        amountPerVoucher: amount,
      });

      statusVouchers.map((item) => {
        item.voucherCoupons.map((voucher) => {
          if (voucher.status === status) {
            const data = {
              title: item.title,
              description: item.description,
              voucherKey: item.voucherKey,
              amount: item.amountPerVoucher,
              couponData: voucher,
            };
            sortVouchers.push(data);
          }
        });
      });

      return res.status(200).send({
        success: true,
        data: {
          vouchers: sortVouchers,
        },
        message: "fetched vouchers successfully.",
      });
    }
  }),

  //   get one  vouchers
  getOneVouchersController: asyncHandler(async (req, res, next) => {
    const { voucherId, status } = req.query;
    let sortVouchers = [];

    //   check if user exist
    const voucher = await voucherModel.findOne({ _id: voucherId });

    if (!voucher) {
      return res.status(400).send({
        success: false,
        message: "voucher not found.",
      });
    }

    // sort by status
    if (status) {
      const statusVouchers = await voucherModel.find({
        _id: voucherId,
      });

      statusVouchers.map((item) => {
        item.voucherCoupons.map((voucher) => {
          if (voucher.status === status) {
            const data = {
              title: item.title,
              description: item.description,
              voucherKey: item.voucherKey,
              amount: item.amountPerVoucher,
              couponData: voucher,
            };
            sortVouchers.push(data);
          }
        });
      });

      return res.status(200).send({
        success: true,
        data: {
          vouchers: sortVouchers,
        },
        message: "fetched voucher status successfully.",
      });
    }

    return res.status(200).send({
      success: true,
      data: {
        voucher: voucher,
      },
      message: "fetched voucher successfully.",
    });
  }),

  //   edit profile controller
  postEditProfileController: asyncHandler(async (req, res, next) => {
    const { id } = req.query;
    let { name, email, phone } = req.body;

    const body = { ...req.body };

    // Run Hapi/Joi validation
    const { error } = await editProfileValidation.validateAsync(body);
    if (error) {
      return res.status(400).send({
        success: false,
        message: "Validation failed",
        errMessage: error.details[0].message,
      });
    }

    //   check if user exist
    const user = await User.findOne({ _id: id });

    if (!user) {
      return res.status(400).send({
        success: false,
        message: "user not found.",
      });
    }

    // update name
    if (name) {
      user.name = name;
      await user.save();
    }

    // update email
    if (email) {
      user.email = email;
      await user.save();
    }

    // update phone number
    if (phone) {
      user.phone = phone;
      await user.save();
    }

    // update image
    if (req.file) {
      if (user.isCompany) {
        // send image to Cloudinary
        companyLogo = await uploadImageSingle(req, res, next);
        user.companyLogo = companyLogo;
        await user.save();
      } else {
        return res.status(400).send({
          success: false,
          message: "Only companies can have companyLogo",
        });
      }
    }

    return res.status(200).send({
      success: true,
      data: {
        user: user,
      },
      message: "Updated user successfully.",
    });
  }),
};
