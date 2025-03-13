const nodemailer = require('nodemailer');
const schedule = require("node-schedule");

const asyncHandler = require("../middlewares/asyncHandler");
const scheduleDeliveryModel = require("../models/scheduleDelivery.model");


const transporter = nodemailer.createTransport({
  host: 'smtp.improvmx.com',
  port: 587, // or 465 (for SSL)
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER, // Replace with your Improvmx username
    pass: process.env.MAIL_PASSWORD, // Replace with your Improvmx password
  }
});

const sendMail = asyncHandler(async (mailOptions) => {
  const { to, subject, html, deliveryTime } = mailOptions;

  // Convert deliveryTime to a valid date or null
  const deliveryDate = deliveryTime ?? null;

  if (deliveryDate && !isNaN(deliveryDate)) {
    try {
      // Store the email in the database before scheduling
      const email = await scheduleDeliveryModel.create({
        to,
        subject,
        html,
        deliveryTime,
        status: "pending",
      });

      // console.log(`Email scheduled for ${email}`);

      try {
        // Schedule the email
        schedule.scheduleJob(deliveryDate, async () => {
          transporter.sendMail({
            from: `"UsePays.co" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html,
          });

          // Mark Status as sent in DB
          await scheduleDeliveryModel.findByIdAndUpdate(email._id, { status: "sent" });

          console.log("Scheduled email sent successfully");
        })
      } catch (error) {
        console.error("Error scheduling email:", error)
        throw error;  // Rethrow the error to exit the function
      };

    } catch (error) {
      console.error("Error creating email in database:", error);
      throw error; // Rethrow the error to be handled by asyncHandler
    }
  }
  else {
    transporter.sendMail(
      {
        from: `"UsePays.co" <${process.env.MAIL_USER}>`, // Sender's email
        to: mailOptions.to, // Recipient's email
        subject: mailOptions.subject, // Email subject
        html: mailOptions.html, // HTML content of the email
        head: mailOptions.html, // HTML content of the email
      },
      function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      }
    );
  }
});

module.exports = sendMail;

