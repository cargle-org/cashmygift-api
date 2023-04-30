const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

let transporter = nodemailer.createTransport({
    name: "mail.usepays.co",
    host: "mail.usepays.co",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER, //hi@usepays.co
      pass: process.env.MAIL_PASSWORD, //(Gloed_c0)
    },
    tls: {
      rejectUnauthorized: false,
    },
});

const sendMail = (mailOptions) => {
  transporter.sendMail(
    {
      from: `"CMG.co" ${process.env.MAIL_USER}`,
      to: mailOptions.to,
      subject: mailOptions.subject || "No Subject",
      html: mailOptions.html,
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
