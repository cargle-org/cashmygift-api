// Dependencies
const mongoose = require("mongoose");

// Stuff
const Schema = mongoose.Schema;

// voucher Draft Schema
const voucherDraftSchema = new Schema(
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
    backgroundStyle: {
      type: String,
      default: "",
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    voucherKey: {
      type: String,
      required: false,
    },
    logo: {
      type: String,
      default: "",
      required: false
    },
    totalNumberOfVouchers: {
      type: Number,
      default: 0,
      required: false,
    },
    amountPerVoucher: {
      type: Number,
      default: 0,
      required: false,
    },
    expiry_date: {
      type: Date,
      // required: true,
    },

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("VoucherDraft", voucherDraftSchema);
