import nodemailer from 'nodemailer';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password',
  },
});

// Verify transporter connection (optional, for debugging)
transporter.verify((error, success) => {
  if (error) {
    console.warn('Email transporter verification failed:', error.message);
  } else {
    console.log('Email transporter ready');
  }
});

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetLink - Full reset link with token
 * @returns {Promise}
 */
export const sendPasswordResetEmail = async (email, resetLink) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@lifelink.com',
      to: email,
      subject: 'LifeLink - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LifeLink</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Every Second Counts</p>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #6b7280; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px;">
              Or copy and paste this link in your browser:<br/>
              <span style="word-break: break-all; color: #3b82f6;">${resetLink}</span>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              Do not share this link with anyone.
            </p>
          </div>
        </div>
      `,
      text: `
        Password Reset Request
        
        We received a request to reset your password. Visit this link to create a new password:
        ${resetLink}
        
        This link will expire in 1 hour.
        If you didn't request a password reset, please ignore this email.
        Do not share this link with anyone.
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
    return result;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
};

export default { sendPasswordResetEmail };
