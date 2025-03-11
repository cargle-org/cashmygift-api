const mongoose = require("mongoose");

// Stuff
const Schema = mongoose.Schema;

const scheduledEmailSchema = new Schema({
  to: String,
  subject: String,
  html: String,
  deliveryTime: Number, // UNIX timestamp in seconds
  status: { type: String, enum: ["pending", "sent"], default: "pending" },
}, {
  timestamps: true
});

module.exports = mongoose.model("ScheduledEmail", scheduledEmailSchema);
