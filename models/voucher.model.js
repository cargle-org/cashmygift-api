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
    totalNumberOfVouchers: {
      type: Number,
      required: true,
    },
    amountPerVoucher: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Voucher", voucherSchema);
