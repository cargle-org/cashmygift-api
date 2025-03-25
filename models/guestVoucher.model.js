// Dependencies
const mongoose = require("mongoose");

// Stuff
const Schema = mongoose.Schema;

// User Schema
const guestVoucherSchema = new Schema(
  {
    transactionId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    title: {
      type: String,
      required: true,
    },
    backgroundStyle: {
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
    logo: {
      type: String,
      default: "",
      required: false
    },
    specialKey: {
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
      // required: true,
    },
    voucherCoupons: [],
    recipients: [],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GuestVoucher", guestVoucherSchema);
