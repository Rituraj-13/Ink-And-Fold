import { Resend } from "resend";

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendOtpEmail(
  email: string,
  otp: string,
  resendApiKey: string,
) {
  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send({
    from: "Ink & Fold <otp@noreply.riturajdey.dev>",
    to: [email],
    subject: "Verify your Ink & Fold Account",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to Ink & Fold!</h2>
        <p>Please use the following 6-digit verification code to complete your registration:</p>
        <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }

  return data;
}
