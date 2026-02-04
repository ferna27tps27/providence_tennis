/**
 * Email service for sending authentication emails
 * 
 * Note: This is a basic implementation. In production, use a service like
 * SendGrid, AWS SES, or Nodemailer with SMTP.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3009";
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@providencetennis.com";

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  
  // In production, use a real email service
  // For now, we'll just log it
  console.log(`
========================================
EMAIL VERIFICATION
========================================
To: ${email}
From: ${EMAIL_FROM}
Subject: Verify your email address

Hi ${name},

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Thanks,
Providence Tennis Academy
========================================
  `);
  
  // TODO: Integrate with actual email service (SendGrid, Nodemailer, etc.)
  // Example with Nodemailer:
  // await transporter.sendMail({
  //   from: EMAIL_FROM,
  //   to: email,
  //   subject: "Verify your email address",
  //   html: `...`
  // });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  
  // In production, use a real email service
  // For now, we'll just log it
  console.log(`
========================================
PASSWORD RESET
========================================
To: ${email}
From: ${EMAIL_FROM}
Subject: Reset your password

Hi ${name},

You requested to reset your password. Click the link below to reset it:

${resetUrl}

This link will expire in 30 minutes.

If you didn't request a password reset, please ignore this email.

Thanks,
Providence Tennis Academy
========================================
  `);
  
  // TODO: Integrate with actual email service
}

/**
 * Send welcome email after signup
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  console.log(`
========================================
WELCOME EMAIL
========================================
To: ${email}
From: ${EMAIL_FROM}
Subject: Welcome to Providence Tennis Academy!

Hi ${name},

Welcome to Providence Tennis Academy! We're excited to have you join our community.

Your account has been created successfully. Please verify your email address to get started.

If you have any questions, feel free to contact us at 401-935-4336.

Thanks,
Providence Tennis Academy
========================================
  `);
  
  // TODO: Integrate with actual email service
}
