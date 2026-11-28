import nodemailer from "nodemailer";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function getSmtpConfig(): SmtpConfig {
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.trim().toLowerCase() === "true"
    : port === 465;
  const user = (process.env.SMTP_USER || "").trim();
  // Gmail App Password thường hiển thị theo từng cụm 4 ký tự có khoảng trắng
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const from = (process.env.SMTP_FROM || (user ? `"Đúng Việc" <${user}>` : "")).trim();

  if (!user || !pass) {
    throw new Error(
      "Chưa cấu hình tài khoản SMTP (SMTP_USER / SMTP_PASS) trong môi trường máy chủ."
    );
  }
  return { host, port, secure, user, pass, from };
}

function createTransporter() {
  const cfg = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return { transporter, cfg };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapEmailLayout(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#F4F6FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#222222;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5EAF2;">
    <div style="background:#306BD9;padding:20px 24px;color:#FFFFFF;">
      <div style="font-size:18px;font-weight:700;letter-spacing:-0.2px;">Đúng Việc</div>
      <div style="font-size:12.5px;opacity:0.9;margin-top:2px;">${escapeHtml(title)}</div>
    </div>
    <div style="padding:24px;font-size:14.5px;line-height:1.6;color:#333333;">
      ${contentHtml}
    </div>
    <div style="padding:14px 24px;background:#F8FAFC;border-top:1px solid #EEF2F7;font-size:12px;color:#666666;">
      Email này được gửi tự động từ hệ thống Đúng Việc. Vui lòng không chia sẻ mã xác minh cho bất kỳ ai.
    </div>
  </div>
</body>
</html>`;
}

export async function sendPasswordResetOtpEmail(params: {
  to: string;
  fullName: string;
  otp: string;
  expiresMinutes: number;
}): Promise<void> {
  const { transporter, cfg } = createTransporter();
  const safeName = escapeHtml(params.fullName || "bạn");
  const safeOtp = escapeHtml(params.otp);
  const mins = params.expiresMinutes;

  const html = wrapEmailLayout(
    "Xác minh đặt lại mật khẩu",
    `
      <p style="margin:0 0 12px;">Xin chào <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 16px;">Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản <strong>${escapeHtml(params.to)}</strong>. Vui lòng nhập mã xác minh dưới đây:</p>
      <div style="margin:18px 0;padding:16px;background:#F2F6FC;border:1px dashed #306BD9;border-radius:12px;text-align:center;">
        <span style="font-size:30px;font-weight:700;letter-spacing:8px;color:#306BD9;font-family:monospace;">${safeOtp}</span>
      </div>
      <p style="margin:0 0 8px;font-size:13.5px;color:#555555;">Mã có hiệu lực trong <strong>${mins} phút</strong> và chỉ dùng được một lần.</p>
      <p style="margin:0;font-size:13px;color:#777777;">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email — mật khẩu hiện tại của bạn vẫn an toàn.</p>
    `
  );

  const text = [
    `Xin chào ${params.fullName || "bạn"},`,
    "",
    `Mã xác minh đặt lại mật khẩu Đúng Việc của bạn là: ${params.otp}`,
    `Mã có hiệu lực trong ${mins} phút và tối đa 5 lần nhập sai.`,
    "",
    "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.",
  ].join("\n");

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject: `[Đúng Việc] Mã xác minh đặt lại mật khẩu: ${params.otp}`,
    text,
    html,
  });
}

export async function sendPasswordResetSuccessEmail(params: {
  to: string;
  fullName: string;
}): Promise<void> {
  const { transporter, cfg } = createTransporter();
  const safeName = escapeHtml(params.fullName || "bạn");
  const timeStr = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());

  const html = wrapEmailLayout(
    "Đặt lại mật khẩu thành công",
    `
      <p style="margin:0 0 12px;">Xin chào <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 12px;">Mật khẩu cho tài khoản <strong>${escapeHtml(params.to)}</strong> vừa được đặt lại thành công lúc <strong>${escapeHtml(timeStr)}</strong>.</p>
      <p style="margin:0;font-size:13.5px;color:#555555;">Bạn có thể đăng nhập lại ngay bằng mật khẩu mới. Nếu không phải bạn thực hiện thao tác này, hãy đổi mật khẩu ngay lập tức.</p>
    `
  );

  const text = [
    `Xin chào ${params.fullName || "bạn"},`,
    "",
    `Mật khẩu tài khoản ${params.to} vừa được đặt lại thành công lúc ${timeStr}.`,
    "Bạn có thể đăng nhập lại ngay bằng mật khẩu mới.",
  ].join("\n");

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject: "[Đúng Việc] Mật khẩu của bạn đã được đặt lại thành công",
    text,
    html,
  });
}
