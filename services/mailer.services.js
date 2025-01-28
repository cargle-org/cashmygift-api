const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

let transporter = nodemailer.createTransport({
  // service: "gmail", // Use Gmail as the service
  // auth: {
  //   user: process.env.MAIL_USER, // chike.sn@gmail.com
  //   pass: process.env.MAIL_PASSWORD, // Your Gmail app password
  // },
  name: "mail.usepays.co",
  host: "mail.usepays.co", // Replace with your Bluehost mail host
  port: 465, // Use 587 for TLS
  secure: true, // Set to false if using port 587
  requireTLS: true,
  auth: {
    user: process.env.MAIL_USER, // Your domain email
    pass: process.env.MAIL_PASSWORD, // Your email password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendMail = (mailOptions) => {
  transporter.sendMail(
    {
      from: `"UsePays.co" <${process.env.MAIL_USER}>`, // Sender's email
      to: mailOptions.to, // Recipient's email
      subject: mailOptions.subject || "No Subject", // Email subject
      html: mailOptions.html, // HTML content of the email
    },
    function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    }
  );
};

module.exports = sendMail;

// const nodemailer = require("nodemailer");
// const dotenv = require("dotenv").config();

// let transporter = nodemailer.createTransport({
//   name: "mail.usepays.co",
//   host: "mail.usepays.co",
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.MAIL_USER, // hi@usepays.co
//     pass: process.env.MAIL_PASSWORD, // (Gloed_c0)
//   },
//   tls: {
//     rejectUnauthorized: false,
//   },
// });

// const sendMail = (mailOptions) => {
//   transporter.sendMail(
//     {
//       from: `"usepays.co" ${process.env.MAIL_USER}`,
//       to: mailOptions.to,
//       subject: mailOptions.subject || "No Subject",
//       html: mailOptions.html,
//     },
//     function (error, info) {
//       if (error) {
//         console.log(error);
//       } else {
//         console.log("Email sent: " + info.response);
//       }
//     }
//   );
// };

// module.exports = sendMail;
