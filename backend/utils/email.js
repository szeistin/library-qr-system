const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

async function sendReminderEmail(to, bookTitle, dueDate) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
      
      <div style="background-color: #1B3A6B; padding: 24px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0;">Polangui Municipal Library</h2>
        <p style="color: #C9A227; margin: 4px 0 0;">Book Return Reminder</p>
      </div>

      <div style="padding: 28px;">
        <p style="color: #333;">Dear Patron,</p>
        <p style="color: #333;">This is a friendly reminder that the book you borrowed:</p>

        <div style="background-color: #F0F4F8; border-left: 4px solid #1B3A6B; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
          <strong style="color: #1B3A6B; font-size: 16px;">"${bookTitle}"</strong><br/>
          <span style="color: #555;">is due on <strong>${dueDate}</strong>.</span>
        </div>

        <p style="color: #333;">Please return it to the library <strong>on or before the due date</strong>.</p>

        <div style="background-color: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 14px 16px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            ⚠️ <strong>Important:</strong> Failure to return the book on time will 
            <strong>restrict your borrowing privileges</strong>. You will not be able to 
            borrow any other books until your current loan is settled.
          </p>
        </div>

        <p style="color: #333;">If you have already returned the book, please disregard this message.</p>
        <p style="color: #333;">For concerns, please visit the library or contact us directly.</p>
        <br/>
        <p style="color: #333;">Thank you for your cooperation,<br/>
        <strong>Polangui Municipal Library</strong></p>
      </div>

      <div style="background-color: #F5F7FA; padding: 14px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>

    </div>
  `;

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      subject: "📚 Library Book Due Date Reminder – Action Required",
      html,
    }),
  });

  const result = await response.json();
  if (!result.success) throw new Error("Google Script failed to send email");
}

module.exports = { sendReminderEmail };