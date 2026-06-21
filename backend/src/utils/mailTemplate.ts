import { Resend } from "resend";

export async function sendOtpEmail(
  email: string,
  otp: string,
  resendApiKey: string,
) {
  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send({
    from: "Ink & Fold <notifications@noreply.riturajdey.dev>",
    to: [email],
    subject: "Verify your Ink & Fold Account",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Welcome to Ink & Fold!</h2>
        <p>Please use the following 6-digit verification code to complete your registration:</p>
        <div style="background: #f8fafc; padding: 15px; font-size: 28px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 6px; margin: 20px 0; border: 1px solid #cbd5e1; color: #0f172a;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 0.9rem;">This code is valid for <strong>10 minutes</strong>. If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }

  return data;
}

export async function sendFlaggedContentMail(
  email: string,
  postTitle: string,
  flaggedMetrics: string[],
  resendApiKey: string,
) {
  const resend = new Resend(resendApiKey);
  const metricsList = flaggedMetrics
    .map((m) => `<li style="font-family: monospace; color: #b91c1c;">${m}</li>`)
    .join("");

  const { data, error } = await resend.emails.send({
    from: "Ink & Fold <notifications@noreply.riturajdey.dev>",
    to: [email],
    subject: "Your post is under review - Ink & Fold",
    html: `
      <div style="font-family: 'Georgia', serif; padding: 30px; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; line-height: 1.6;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #9b3922; padding-bottom: 10px; font-weight: normal;">Story Under Moderation Review</h2>
        <p>Hello,</p>
        <p>Your draft story titled <strong>"${postTitle}"</strong> has triggered our automated content safety filters and has been routed to our moderation team for a manual review before it can be published.</p>
        <p><strong>Flagged metrics detected:</strong></p>
        <ul style="padding-left: 20px;">
          ${metricsList}
        </ul>
        <p>Our administrators will review your story shortly. If approved, it will be published automatically. Otherwise, it will be returned to your drafts with editor feedback.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #64748b; font-size: 0.85rem; font-family: sans-serif;">Thank you for writing on Ink & Fold.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send flagged content email: ${error.message}`);
  }
  return data;
}

export async function sendFlaggedContentApprovalMail(
  email: string,
  postTitle: string,
  resendApiKey: string,
) {
  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send({
    from: "Ink & Fold <notifications@noreply.riturajdey.dev>",
    to: [email],
    subject: "Your story has been approved and published! - Ink & Fold",
    html: `
      <div style="font-family: 'Georgia', serif; padding: 30px; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; line-height: 1.6;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #10b981; padding-bottom: 10px; font-weight: normal;">Story Approved & Published!</h2>
        <p>Great news!</p>
        <p>Our moderation team has reviewed your story <strong>"${postTitle}"</strong> and approved it for publication. It is now live on the Ink & Fold platform for all readers to discover.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #64748b; font-size: 0.85rem; font-family: sans-serif;">Happy writing,<br>The Ink & Fold Team</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send approval email: ${error.message}`);
  }
  return data;
}

export async function sendFlaggedContentRejectMail(
  email: string,
  postTitle: string,
  reason: string | null,
  resendApiKey: string,
) {
  const resend = new Resend(resendApiKey);
  const reasonText = reason
    ? `<blockquote style="border-left: 3px solid #b91c1c; padding-left: 15px; margin: 20px 0; color: #57534e; font-style: italic;">${reason}</blockquote>`
    : `<p><em>No additional feedback was provided.</em></p>`;

  const { data, error } = await resend.emails.send({
    from: "Ink & Fold <notifications@noreply.riturajdey.dev>",
    to: [email],
    subject: "Feedback on your story - Ink & Fold",
    html: `
      <div style="font-family: 'Georgia', serif; padding: 30px; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; line-height: 1.6;">
        <h2 style="color: #7c2d12; border-bottom: 2px solid #ea580c; padding-bottom: 10px; font-weight: normal;">Story Returned to Drafts</h2>
        <p>Hello,</p>
        <p>Your story <strong>"${postTitle}"</strong> was reviewed by our moderation team and has been returned to your drafts for revisions.</p>
        <p><strong>Moderation feedback:</strong></p>
        ${reasonText}
        <p>You can edit and resubmit your story once you have addressed this feedback.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #64748b; font-size: 0.85rem; font-family: sans-serif;">Regards,<br>The Ink & Fold Team</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send rejection email: ${error.message}`);
  }
  return data;
}

export async function sendUserBanMail(email: string, resendApiKey: string) {
  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send({
    from: "Ink & Fold <notifications@noreply.riturajdey.dev>",
    to: [email],
    subject: "Important account notification - Ink & Fold",
    html: `
      <div style="font-family: sans-serif; padding: 30px; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #fca5a5; border-radius: 8px; line-height: 1.6;">
        <h2 style="color: #991b1b; border-bottom: 2px solid #ef4444; padding-bottom: 10px; font-weight: bold;">Account Suspension Notification</h2>
        <p>Hello,</p>
        <p>We are writing to inform you that your Ink & Fold account has been suspended due to violations of our community guidelines.</p>
        <p>As a result, your access to the platform has been restricted, and your active sessions have been terminated. If you believe this is a mistake, you may reach out to support at <a href="mailto:support@riturajdey.dev" style="color: #2563eb;">support@riturajdey.dev</a>.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #64748b; font-size: 0.85rem;">The Ink & Fold Moderation Team</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send ban notification email: ${error.message}`);
  }
  return data;
}
