// Dependencies
const mongoose = require("mongoose");

// Stuff
const Schema = mongoose.Schema;

// Winner Schema
const winnerSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    claimedVoucherCode: {
      type: String,
      required: true,
    },
    bankCode: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    phone_number: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Winner", winnerSchema);
