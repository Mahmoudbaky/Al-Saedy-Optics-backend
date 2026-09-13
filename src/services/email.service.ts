import nodemailer, { type Transporter } from "nodemailer";
import { env, isProd } from "../config/env.js";
import { createLogger } from "../config/logger.js";

const log = createLogger("email");

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Thin mail gateway. When SMTP is not configured (local dev / CI) emails are
 * written to the log instead of failing, so OTP flows still work end-to-end.
 */
class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      });
      this.transporter
        .verify()
        .then(() => log.info({ host: env.SMTP_HOST }, "SMTP transport ready"))
        .catch((err) =>
          log.error({ err }, "SMTP verification failed – emails will fail"),
        );
    } else if (isProd) {
      log.warn(
        "SMTP is not configured in production – emails will only be logged",
      );
    } else {
      log.info("SMTP not configured – emails will be logged to the console");
    }
  }

  async send(mail: Mail): Promise<void> {
    if (!this.transporter) {
      log.info(
        { to: mail.to, subject: mail.subject, text: mail.text },
        "📧 [dev] email",
      );
      return;
    }
    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      ...mail,
    });
    log.info(
      { to: mail.to, subject: mail.subject, messageId: info.messageId },
      "Email sent",
    );
  }

  /** Bilingual (ar/en) one-time-code email used by all OTP flows. */
  async sendOtp(
    to: string,
    otp: string,
    purpose:
      | "sign-in"
      | "email-verification"
      | "forget-password"
      | "change-email",
  ) {
    const titles: Record<typeof purpose, { ar: string; en: string }> = {
      "sign-in": { ar: "رمز تسجيل الدخول", en: "Your sign-in code" },
      "email-verification": {
        ar: "تأكيد البريد الإلكتروني",
        en: "Verify your email",
      },
      "forget-password": {
        ar: "إعادة تعيين كلمة المرور",
        en: "Reset your password",
      },
      "change-email": {
        ar: "تغيير البريد الإلكتروني",
        en: "Confirm your new email",
      },
    };
    const title = titles[purpose];
    const minutes = 5;
    await this.send({
      to,
      subject: `${title.en} · ${title.ar} — ${env.APP_NAME}`,
      text: `${title.en}: ${otp} (expires in ${minutes} minutes)\n${title.ar}: ${otp} (صالح لمدة ${minutes} دقائق)`,
      html: otpTemplate({ title, otp, minutes }),
    });
  }
}

function otpTemplate({
  title,
  otp,
  minutes,
}: {
  title: { ar: string; en: string };
  otp: string;
  minutes: number;
}) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1a1d21;">
    <div style="background:#16294F; color:#fff; padding: 22px 24px; border-radius: 14px 14px 0 0;">
      <div style="font-size: 13px; opacity: .8;">${env.APP_NAME}</div>
      <div style="font-size: 22px; font-weight: 700; margin-top: 4px;">${title.en}</div>
      <div style="font-size: 18px; margin-top: 2px;" dir="rtl">${title.ar}</div>
    </div>
    <div style="background:#f6f7f9; padding: 28px 24px; border-radius: 0 0 14px 14px; text-align: center;">
      <div style="display:inline-block; background:#fff; border: 2px dashed #16294F; border-radius: 12px; padding: 14px 28px; font-size: 34px; font-weight: 700; letter-spacing: 8px; color:#16294F;">${otp}</div>
      <p style="margin: 18px 0 4px; color:#555;">This code expires in <b>${minutes} minutes</b>.</p>
      <p style="margin: 0; color:#555;" dir="rtl">هذا الرمز صالح لمدة <b>${minutes} دقائق</b>.</p>
      <p style="margin-top: 22px; font-size: 12px; color:#888;">If you didn't request this, you can safely ignore this email.<br/><span dir="rtl">إذا لم تطلب هذا الرمز فتجاهل هذه الرسالة.</span></p>
    </div>
  </div>`;
}

export const emailService = new EmailService();
