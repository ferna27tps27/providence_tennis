/**
 * Email service for sending authentication emails
 * 
 * Note: This is a basic implementation. In production, use a service like
 * SendGrid, AWS SES, or Nodemailer with SMTP.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3009";
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@providencetennis.com";

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.RENDER === "true";
}

function redactEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "[redacted]";
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  if (isProductionRuntime()) {
    console.log(
      JSON.stringify({
        scope: "auth_email",
        event: "verification_email_requested",
        to: redactEmail(email),
        providerConfigured: false,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // In non-production environments, log the link to support local testing.
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

  if (isProductionRuntime()) {
    console.log(
      JSON.stringify({
        scope: "auth_email",
        event: "password_reset_requested",
        to: redactEmail(email),
        providerConfigured: false,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // In non-production environments, log the link to support local testing.
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
