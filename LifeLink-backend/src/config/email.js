import nodemailer from 'nodemailer';

const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@lifelink.local';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('[email] EMAIL_USER or EMAIL_PASS is missing. Gmail transporter may fail in production.');
}

const renderTemplate = ({ title, intro, otpLabel, otp, footer }) => ({
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">LifeLink</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Every Second Counts</p>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
        <p style="color: #4b5563; line-height: 1.6;">${intro}</p>
        <div style="margin: 24px 0; padding: 18px; border-radius: 8px; background: #ffffff; border: 1px solid #e5e7eb; text-align: center;">
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">${otpLabel}</div>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827;">${otp}</div>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">${footer}</p>
      </div>
    </div>
  `,
  text: `${title}\n\n${intro}\n\n${otpLabel}: ${otp}\n\n${footer}`,
});

export const sendMail = async ({ to, subject, ...content }) => {
  const mailOptions = {
    from: `"LifeLink" <${process.env.EMAIL_USER || fromAddress}>`,
    to,
    subject,
    ...content,
  };

  try {
    console.log('📡 USING PORT:', 587);
    console.log('[email] Sending email:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      from: mailOptions.from,
    });

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL SENT SUCCESSFULLY:', result?.response || result);
    return result;
  } catch (error) {
    console.error('❌ EMAIL SEND ERROR:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (email, otp) => {
  const content = renderTemplate({
    title: 'Verify Your Email',
    intro: 'Use the OTP below to verify your email address and activate your LifeLink account.',
    otpLabel: 'Email verification OTP',
    otp,
    footer: 'This OTP expires in 5 minutes. If you did not create this account, you can ignore this email.',
  });

  return sendMail({
    to: email,
    subject: 'LifeLink - Verify your email',
    ...content,
  });
};

export const sendPasswordResetEmail = async (email, otp) => {
  const content = renderTemplate({
    title: 'Reset Your Password',
    intro: 'We received a password reset request for your LifeLink account. Use the OTP below to continue.',
    otpLabel: 'Password reset OTP',
    otp,
    footer: 'This OTP expires in 5 minutes. Do not share it with anyone.',
  });

  return sendMail({
    to: email,
    subject: 'LifeLink - Password reset OTP',
    ...content,
  });
};

export default { sendVerificationEmail, sendPasswordResetEmail };
