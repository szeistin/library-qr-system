const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
   service: "gmail",
   auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
   },
});

async function sendReminderEmail(to, bookTitle, dueDate) {
   const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: "Library Book Due Date Reminder",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1B3A6B;">Polangui Municipal Library</h2>
        <p>Dear Patron,</p>
        <p>This is a reminder that the book <strong>"${bookTitle}"</strong> is due on <strong>${dueDate}</strong>.</p>
        <p>Please return it to the library on or before the due date to avoid penalties.</p>
        <br/>
        <p>Thank you,<br/>Polangui Municipal Library</p>
      </div>
    `,
   };
   await transporter.sendMail(mailOptions);
}

module.exports = { sendReminderEmail };


