const { default: mongoose } = require("mongoose");

const linkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    userLinkId: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["wedding", "birthday", "others"],
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      unique: true,
      required: true,
    },
    amount:{
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    linkExpiry: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model("Link", linkSchema);
