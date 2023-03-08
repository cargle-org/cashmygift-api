// Dependencies
const mongoose = require("mongoose");

// Stuff
const Schema = mongoose.Schema;

// User Schema
const userSchema = new Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    emailVerificationToken: {
        type: String,
        required: true,
    },
    verifiedEmail: {
        type: Boolean,
        default: false,
    },
    phone: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    companyName: {
        type: String,
        // required: true,
    },
    companyLogo: {
        type: String,
        default: "",
        // required: false,
    },
    companyEmail: {
        type: String,
        // required: true,
    },
    companyPhone: {
        type: String,
    },
    walletBalance: {
        type: Number,
        default: 0,
    },
    role: {
        type: String,
        default: "user",
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model("User", userSchema);