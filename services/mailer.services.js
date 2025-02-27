const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.improvmx.com',
  port: 587, // or 465 (for SSL)
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER, // Replace with your Improvmx username
    pass: process.env.MAIL_PASSWORD, // Replace with your Improvmx password
  }
});

const sendMail = (mailOptions) => {
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
};

module.exports = sendMail;

