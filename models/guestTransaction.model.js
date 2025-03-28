const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const GuestTransactionSchema = new Schema(
  {
    name: {
      type: String,
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    tx_ref: {
      type: String,
      required: true,
      unique: true,
    },
    transactionReference: {
      type: String,
      required: true,
      unique: true,
    },
    paymentReference: {
      type: String,
    },
    flw_ref: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      defaultValue: "initiated",
    },
    fundingType: {
      type: String,
      default: "guest",
      enum: ["guest"]
    },
    email: { type: String, required: true },
    link: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Link",
    },

  },
  { timestamps: true }
);

module.exports = mongoose.model("GuestTransaction", GuestTransactionSchema);
