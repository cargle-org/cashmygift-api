// Dependencies
const mongoose = require("mongoose");

// Stuff
const Schema = mongoose.Schema;

// User Schema
const voucherSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: "",
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    voucherKey: {
      type: String,
      required: true,
    },
    totalNumberOfVouchers: {
      type: Number,
      default: 0,
      required: true,
    },
    amountPerVoucher: {
      type: Number,
      default: 0,
      required: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
      required: true,
    },
    totalCashedAmount: {
      type: Number,
      default: 0,
    },
    cashedPercentage: {
      type: Number,
      default: 0,
    },
    vouchersCashed: {
      type: Number,
      default: 0,
    },
    expiry_date: {
      type: Date,
      required: true,
    },
    voucherCoupons: [],
    recipients: [],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Voucher", voucherSchema);
