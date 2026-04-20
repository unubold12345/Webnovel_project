import nodemailer from "nodemailer";

// SendGrid SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.sendgrid.net",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "apikey", // SendGrid uses "apikey" as username
    pass: process.env.SMTP_PASS, // Your SendGrid API Key
  },
});

function logDevModeEmail(email: string, verificationUrl: string) {
  console.log("=================================");
  console.log("📧 Verification Email (Development Mode)");
  console.log("To:", email);
  console.log("Verification URL:", verificationUrl);
  console.log("=================================");
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.AUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;

  // If SendGrid API key is not configured, use development mode
  if (!process.env.SMTP_PASS) {
    console.log("=================================");
    console.log("📧 Password Reset Email (Development Mode)");
    console.log("To:", email);
    console.log("Reset URL:", resetUrl);
    console.log("=================================");
    return { success: true, devMode: true, resetUrl };
  }

  const message = {
    from: process.env.SMTP_FROM || "noreply@example.com",
    to: email,
    subject: "Нууц үг сэргээх - Webnovel Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Нууц үг сэргээх</h2>
        <p>Сайн байна уу,</p>
        <p>Та нууц үгээ сэргээх хүсэлт илгээлээ. Доорх холбоос дээр дарж шинэ нууц үг тохируулна уу:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Нууц үг сэргээх
          </a>
        </div>
        <p>Эсвэл дараах холбоосыг хөтөчид хуулж оруулна уу:</p>
        <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Хэрэв та энэ хүсэлтийг өөрөө илгээгээгүй бол энэ имэйлийг үл тооно уу. Энэ холбоос 1 цагийн дараа хүчингүй болно.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(message);
    return { success: true, devMode: false };
  } catch (error: any) {
    console.error("SMTP Error:", error.message);
    console.log("Falling back to development mode...");
    console.log("=================================");
    console.log("📧 Password Reset Email (Development Mode)");
    console.log("To:", email);
    console.log("Reset URL:", resetUrl);
    console.log("=================================");
    return { success: true, devMode: true, resetUrl };
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.AUTH_URL || "http://localhost:3000"}/auth/verify-email?token=${token}`;

  // If SendGrid API key is not configured, use development mode
  if (!process.env.SMTP_PASS) {
    logDevModeEmail(email, verificationUrl);
    return { success: true, devMode: true, verificationUrl };
  }

  const message = {
    from: process.env.SMTP_FROM || "noreply@example.com",
    to: email,
    subject: "Имэйл хаягаа баталгаажуулна уу - Webnovel Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Бүртгэлээ баталгаажуулна уу</h2>
        <p>Сайн байна уу,</p>
        <p>Та бүртгэлээ амжилттай үүсгэлээ. Доорх холбоос дээр дарж имэйл хаягаа баталгаажуулна уу:</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Имэйл баталгаажуулах
          </a>
        </div>
        <p>Эсвэл дараах холбоосыг хөтөчид хуулж оруулна уу:</p>
        <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Хэрэв та энэ бүртгэлийг өөрөө хийгээгүй бол энэ имэйлийг үл тооно уу.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(message);
    return { success: true, devMode: false };
  } catch (error: any) {
    // If SMTP fails (e.g., invalid credentials), fall back to development mode
    console.error("SMTP Error:", error.message);
    console.log("Falling back to development mode...");
    logDevModeEmail(email, verificationUrl);
    return { success: true, devMode: true, verificationUrl };
  }
}
