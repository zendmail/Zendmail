import "server-only";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}

// Swap this for a real provider adapter (Postmark, SES, Resend, Sendgrid...)
// by implementing EmailProvider and changing the export below. Nothing
// outside this file should know which provider is in use.
class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput) {
    console.log("─── [dev email] ─────────────────────────────");
    console.log("To:", input.to);
    console.log("Subject:", input.subject);
    console.log(input.text);
    console.log("──────────────────────────────────────────────");
  }
}

const provider: EmailProvider = new ConsoleEmailProvider();

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await provider.send({
    to,
    subject: "Verify your email for Zendmail",
    text: `Confirm your email address to finish setting up your account: ${verifyUrl}`,
    html: `<p>Confirm your email address to finish setting up your account.</p><p><a href="${verifyUrl}">Verify email</a></p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await provider.send({
    to,
    subject: "Reset your Zendmail password",
    text: `Reset your password using this link (expires in 1 hour): ${resetUrl}`,
    html: `<p>Reset your password using the link below. This link expires in 1 hour.</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}

export async function sendCampaignEmail(input: {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  html: string;
  text: string;
}) {
  await provider.send({
    to: input.to,
    subject: `[from ${input.fromName} <${input.fromEmail}>] ${input.subject}`,
    html: input.html,
    text: input.text,
  });
}
