const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendReminderEmail(to, bookTitle, dueDate) {
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "kov2023-7058-45144@bicol-u.edu.ph",
    subject: "📚 Library Book Due Date Reminder – Action Required",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1B3A6B;">Polangui Municipal Library</h2>
        <p>This is a reminder that <strong>"${bookTitle}"</strong> is due on <strong>${dueDate}</strong>.</p>
        <p>⚠️ Failure to return on time will <strong>restrict your borrowing privileges</strong>.</p>
        <p>Thank you,<br/>Polangui Municipal Library</p>
      </div>
    `,
  });
}

module.exports = { sendReminderEmail };