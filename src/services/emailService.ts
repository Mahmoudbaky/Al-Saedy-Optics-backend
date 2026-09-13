import nodemailer from "nodemailer";
import { env } from "../config/env.js";

class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: env.EMAIL_SERVICE || "gmail",
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_APP_PASSWORD,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.log("Email configuration error:", error);
      } else {
        console.log("Email server is ready to send messages");
      }
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: env.EMAIL_FROM,
        to: email,
        subject: "Your Login OTP Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Verification Code</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                Your verification code is:
              </p>
              
              <div style="background: white; border: 2px dashed #667eea; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px;">
                  ${otp}
                </span>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                This code will expire in <strong>10 minutes</strong>
              </p>
            </div>
            
            <div style="text-align: center; color: #888; font-size: 12px;">
              <p>If you didn't request this code, please ignore this email.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        `,
        text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("OTP email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending OTP email:", error);
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<boolean> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You requested a password reset. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </p>
            
            <p style="color: #666; font-size: 12px;">
              If the button doesn't work, copy and paste this link: ${resetUrl}
            </p>
          </div>
        `,
        text: `Password reset requested. Visit: ${resetUrl}`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Password reset email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
