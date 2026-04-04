import { Resend } from 'resend';

const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromAddress = (process.env.RESEND_FROM || 'LifeLink <onboarding@resend.dev>').trim();

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

export const sendMail = async ({ to, subject, html, text }) => {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  console.log('[email] Sending email via Resend:', {
    to,
    subject,
    from: fromAddress,
  });

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error('[email] EMAIL SEND ERROR:', error);
    throw error;
  }

  console.log('[email] EMAIL SENT SUCCESSFULLY:', data);
  return data;
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

export default { sendVerificationEmail };
