// Middlewares
const { createVoucherValidation } = require("../middlewares/validate");
const asyncHandler = require("../middlewares/asyncHandler");
const voucherModel = require("../models/voucher.model");
const { uploadImageSingle } = require("../middlewares/cloudinary");

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

  postCreateVoucherController: asyncHandler(async (req, res, next) => {
    const {
      title,
      description,
      totalNumberOfVouchers,
      amountPerVoucher,
      totalAmount,
    } = req.body;

    const body = { ...req.body, thumbnail: req.file };

    // Run Hapi/Joi validation
    const { error } = await createVoucherValidation.validateAsync(body);
    if (error) return res.status(400).send(error.details[0].message);

    // send image to Cloudinary
    const thumbnail = await uploadImageSingle(req, res, next);

    // create user
    const voucher = new voucherModel({
      userId: req.user.id,
      title,
      thumbnail,
      description,
      totalNumberOfVouchers,
      amountPerVoucher,
      totalAmount,
    });
    await voucher.save();

    console.log(
      "🚀 ~ file: utils.controller.js:50 ~ postCreateVoucherController:asyncHandler ~ voucher:",
      voucher
    );

    return res.status(200).send({
      success: true,
      data: {
        voucher: voucher,
      },
      message: "Created new voucher.",
    });
  }),
};
