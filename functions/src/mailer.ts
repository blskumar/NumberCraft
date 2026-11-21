// Pluggable mailer. No real email vendor is wired in: production must provide
// one (SendGrid/SES Mumbai/Firebase Trigger Email under a DPA, spec docs/legal/09)
// by implementing this interface and returning it from getMailer() in index.ts.

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * Emulator/dev mailer: logs the subject and text to the function log but NEVER
 * the recipient address (parent emails are personal data of a third party).
 * It is only selected when FUNCTIONS_EMULATOR=true or MAILER=log.
 */
export class LogMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    console.log(`[mail:log] subject="${message.subject}"\n${message.text}`);
  }
}

/** In-memory mailer used by tests to read the consent link. */
export class MemoryMailer implements Mailer {
  sent: MailMessage[] = [];
  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }
}

/** Fails closed in production until a real vendor is configured. */
export class UnconfiguredMailer implements Mailer {
  async send(): Promise<void> {
    throw new Error('mailer-not-configured');
  }
}
