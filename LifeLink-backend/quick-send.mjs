import 'dotenv/config';
import { sendMail } from './src/config/email.js';

async function run() {
  try {
    console.log('EMAIL_USER=', process.env.EMAIL_USER);
    console.log('EMAIL_PASS length=', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
    const info = await sendMail({
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
