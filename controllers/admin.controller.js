// Dependencies
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment");

// Models
const User = require("../models/user.model");
const voucherModel = require("../models/voucher.model");

// Middlewares
const asyncHandler = require("../middlewares/asyncHandler");

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

    return res.status(200).send({
      success: true,
      data: {
        user: user,
      },
      message: "fetched user successfully.",
    });
  }),

  //   get all user vouchers
  getAllVouchersController: asyncHandler(async (req, res, next) => {
    //   check if user exist
    const vouchers = await voucherModel.find();

    if (!vouchers) {
      return res.status(400).send({
        success: false,
        message: "no vouchers found.",
      });
    }

    return res.status(200).send({
      success: true,
      data: {
        vouchers: vouchers,
      },
      message: "fetched vouchers successfully.",
    });
  }),

  //   get one  vouchers
  getOneVouchersController: asyncHandler(async (req, res, next) => {
    const { voucherId } = req.query;

    //   check if user exist
    const voucher = await voucherModel.findOne({ _id: voucherId });

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
      message: "fetched voucher successfully.",
    });
  }),
};
