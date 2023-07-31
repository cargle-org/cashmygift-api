const { default: mongoose } = require("mongoose");

const linkSchema = new mongoose.Schema(
  {
    name: {
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
    link: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model("Link", linkSchema);
