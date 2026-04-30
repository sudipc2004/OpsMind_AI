require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

(async () => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('Attempting to send mail as', process.env.SMTP_USER);
    await transporter.sendMail({
      from: `"OpsMind AI" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'Test',
      html: 'Test'
    });
    console.log('Success');
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
