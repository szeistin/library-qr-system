require('dotenv').config();
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '******' : 'missing');
const { sendReminderEmail } = require('./utils/email');

sendReminderEmail('recipient@example.com', 'Test Book', '2026-04-30')
  .then(() => console.log('Email sent'))
  .catch(err => console.error('Email error:', err));

  