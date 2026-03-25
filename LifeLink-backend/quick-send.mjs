import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function run() {
  try {
    console.log('EMAIL_USER=', process.env.EMAIL_USER);
    console.log('EMAIL_PASS length=', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
    await transporter.verify();
    console.log('Transporter verified — attempting send...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'LifeLink test email',
      text: 'Test email from quick-send.mjs',
    });
    console.log('Send success:', info);
  } catch (err) {
    console.error('Send error (full):', err);
    if (err.response) console.error('SMTP response:', err.response.toString());
  }
}
run();