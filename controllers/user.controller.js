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
    // console.log(
    //   "🚀 ~ file: user.controller.js:34 ~ getUserController:asyncHandler ~ user:",
    //   user
    // );

    if (!user) {
      return res.status(400).send({
        success: false,
        message: "user not found.",
      });
    }

    // get all vouchers
    const vouchers = await voucherModel.find({ userId: userId });
    // console.log(
    //   "🚀 ~ file: user.controller.js:49 ~ getUserController:asyncHandler ~ vouchers:",
    //   vouchers
    // );

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

  // get all user vouchers
  // getAllUserVouchersController: asyncHandler(async (req, res, next) => {
  //   const { userId, from, to, amount, status, page = 1 } = req.query;
  //   // console.log("🚀req.query:", req.query);
  //   let sortVouchers = [];
  //   let fromDate = new Date(from);
  //   let toDate = new Date(to);

  //   const limit = 1000000; // Number of vouchers per page
  //   const skip = (page - 1) * limit; // Calculate the number of documents to skip

  //   // Check if voucher exists
  //   const vouchers = await voucherModel.find({ userId: userId });

  //   if (!vouchers || vouchers.length === 0) {
  //     return res.status(400).send({
  //       success: false,
  //       message: "No vouchers found.",
  //     });
  //   }

  //   if ((to && !from) || (!to && from)) {
  //     return res.status(400).send({
  //       success: false,
  //       message: "Date should be a range.",
  //     });
  //   }

  //   // DEFAULT: No needed params? Return all vouchers sorted by creation date with pagination
  //   if (!from && !to && !amount && !status) {
  //     const paginatedVouchers = await voucherModel
  //       .find({ userId: userId })
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(limit);

  //     return res.status(200).send({
  //       success: true,
  //       data: {
  //         vouchers: paginatedVouchers,
  //         page,
  //       },
  //       message: "Fetched vouchers successfully.",
  //     });
  //   }

  //   // Sort by date
  //   if (from && to && !amount && !status) {
  //     const dateVouchers = await voucherModel
  //       .find({
  //         userId: userId,
  //         createdAt: { $gte: fromDate, $lt: toDate },
  //       })
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(limit);
  //     // console.log("🚀dateVouchers:", dateVouchers);

  //     return res.status(200).send({
  //       success: true,
  //       data: {
  //         vouchers: dateVouchers,
  //         page,
  //       },
  //       message: "Fetched vouchers successfully.",
  //     });
  //   }

  //   // Sort by date & amount
  //   if (from && to && amount && !status) {
  //     const amountVouchers = await voucherModel
  //       .find({
  //         userId: userId,
  //         amountPerVoucher: amount,
  //         createdAt: { $gte: fromDate, $lt: toDate },
  //       })
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(limit);
  //     // console.log("🚀amountVouchers:", amountVouchers);

  //     return res.status(200).send({
  //       success: true,
  //       data: {
  //         vouchers: amountVouchers,
  //         page,
  //       },
  //       message: "Fetched vouchers successfully.",
  //     });
  //   }

  //   // Sort by date & status
  //   if (from && to && status) {
  //     const statusVouchers = await voucherModel
  //       .find({
  //         userId: userId,
  //         createdAt: { $gte: fromDate, $lt: toDate },
  //       })
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(limit);

  //     statusVouchers.forEach((item) => {
  //       item.voucherCoupons.forEach((voucher) => {
  //         if (voucher.status === status) {
  //           const data = {
  //             title: item.title,
  //             description: item.description,
  //             voucherKey: item.voucherKey,
  //             amount: item.amountPerVoucher,
  //             couponData: voucher,
  //           };
  //           sortVouchers.push(data);
  //         }
  //       });
  //     });

  //     return res.status(200).send({
  //       success: true,
  //       data: {
  //         vouchers: sortVouchers,
  //         page,
  //       },
  //       message: "Fetched vouchers successfully.",
  //     });
  //   }

  //   // Sort by amount
  //   if (!from && !to && amount) {
  //     const amountVouchers = await voucherModel
  //       .find({
  //         userId: userId,
  //         amountPerVoucher: amount,
  //       })
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(limit);
  //     // console.log("🚀amountVouchers:", amountVouchers);

  //     return res.status(200).send({
  //       success: true,
  //       data: {
  //         vouchers: amountVouchers,
  //         page,
  //       },
  //       message: "Fetched vouchers successfully.",
  //     });
  //   }

  //   // Sort by status
  //   if (!from && !to && status) {
  //     const statusVouchers = await voucherModel
  //       .find({
  //         userId: userId,
  //       })
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(limit);

  //     statusVouchers.forEach((item) => {
  //       item.voucherCoupons.forEach((voucher) => {
  //         if (voucher.status === status) {
  //           const data = {
  //             title: item.title,
  //             description: item.description,
  //             voucherKey: item.voucherKey,
  //             amount: item.amountPerVoucher,
  //             couponData: voucher,
  //           };
  //           sortVouchers.push(data);
  //         }
  //       });
  //     });

  //     return res.status(200).send({
  //       success: true,
  //       data: {
  //         vouchers: sortVouchers,
  //         page,
  //       },
  //       message: "Fetched vouchers successfully.",
  //     });
  //   }

  //   // Sort by date, amount & status
  //   if (from && to && amount && status) {
  //     const statusVouchers = await voucherModel
  //       .find({
  //         userId: userId,
  //         amountPerVoucher: amount,
  //         createdAt: { $gte: fromDate, $lt: toDate },
  //       })
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(limit);

  //     statusVouchers.forEach((item) => {
  //       item.voucherCoupons.forEach((voucher) => {
  //         if (voucher.status === status) {
  //           const data = {
  //             title: item.title,
  //             description: item.description,
  //             voucherKey: item.voucherKey,
  //             amount: item.amountPerVoucher,
  //             couponData: voucher,
  //           };
  //           sortVouchers.push(data);
  //         }
  //       });
  //     });

  //     return res.status(200).send({
  //       success: true,
  //       data: {
  //         vouchers: sortVouchers,
  //         page,
  //       },
  //       message: "Fetched vouchers successfully.",
  //     });
  //   }

  //   // Sort by amount & status
  //   if (amount && status) {
  //     const statusVouchers = await voucherModel
  //       .find({
  //         userId: userId,
  //         amountPerVoucher: amount,
  //       })
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(limit);

  //     statusVouchers.forEach((item) => {
  //       item.voucherCoupons.forEach((voucher) => {
  //         if (voucher.status === status) {
  //           const data = {
  //             title: item.title,
  //             description: item.description,
  //             voucherKey: item.voucherKey,
  //             amount: item.amountPerVoucher,
  //             couponData: voucher,
  //           };
  //           sortVouchers.push(data);
  //         }
  //       });
  //     });

  //     return res.status(200).send({
  //       success: true,
  //       data: {
  //         vouchers: sortVouchers,
  //         page,
  //       },
  //       message: "Fetched vouchers successfully.",
  //     });
  //   }
  // }),

  getAllUserVouchersController: asyncHandler(async (req, res, next) => {
    const {
      userId,
      from,
      to,
      minAmount,
      maxAmount,
      status,
      page = 1,
    } = req.query;

    const limit = 100; // Number of vouchers per page
    const skip = (page - 1) * limit; // Calculate the number of documents to skip
    const query = { userId };

    // Date range filtering
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      query.createdAt = { $gte: fromDate, $lt: toDate };
    } else if ((from && !to) || (!from && to)) {
      return res.status(400).send({
        success: false,
        message: "Date should be a range.",
      });
    }

    // Amount range filtering
    if (minAmount || maxAmount) {
      query.amountPerVoucher = {
        ...(minAmount && { $gte: parseFloat(minAmount) }),
        ...(maxAmount && { $lte: parseFloat(maxAmount) }),
      };
    }

    // Status filtering
    if (status) {
      if (status === "cashed") {
        query.cashedPercentage = 100; // Fully cashed vouchers
      } else if (status === "pending") {
        query.cashedPercentage = { $lt: 100 }; // Pending vouchers
      } else {
        return res.status(400).send({
          success: false,
          message: `Invalid status value: ${status}`,
        });
      }
    }

    try {
      const vouchers = await voucherModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      if (!vouchers || vouchers.length === 0) {
        return res.status(404).send({
          success: false,
          message: "No vouchers found.",
        });
      }

      return res.status(200).send({
        success: true,
        data: {
          vouchers,
          page,
        },
        message: "Fetched vouchers successfully.",
      });
    } catch (error) {
      return res.status(500).send({
        success: false,
        message: "Error fetching vouchers.",
        error: error.message,
      });
    }
  }),

  //   get one  voucher
  getOneVouchersController: asyncHandler(async (req, res, next) => {
    const { voucherId, status } = req.query;
    console.log(
      "🚀 ~ getOneVouchersController:asyncHandler ~ req.query:",
      req.query
    );
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
    console.log(
      "🚀 ~ file: user.controller.js:359 ~ postEditProfileController:asyncHandler ~ req.body:",
      req.body
    );

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
