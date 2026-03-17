/**
 * HeartBound IQ — Guest Management Agent
 *
 * Responsibilities:
 *  - Add / update / delete guests
 *  - Track RSVP status
 *  - Generate AI wedding card HTML
 *  - Send invite emails via Nodemailer (Gmail SMTP)
 */

const nodemailer  = require('nodemailer');
const cardGen     = require('./weddingCardGenerator');

class GuestManagementAgent {
  constructor() {
    this.name = 'GuestManagementAgent';
    this.transporter = null;
    this._initMailer();
  }

  _initMailer() {
    if (!process.env.MAIL_USER || process.env.MAIL_USER === 'your_gmail@gmail.com') {
      console.log(`[${this.name}] Mail not configured — running in preview mode.`);
      return;
    }
    this.transporter = nodemailer.createTransport({
      host:   process.env.MAIL_HOST  || 'smtp.gmail.com',
      port:   parseInt(process.env.MAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  // ─── Generate card HTML (preview or send) ─────────────────────────────────

  async generateCard(weddingDetails) {
    console.log(`[${this.name}] Generating wedding card…`);
    const html = await cardGen.generate(weddingDetails);
    return { success: true, html };
  }

  // ─── Send invite to a single guest ────────────────────────────────────────

  async sendInvite(guest, weddingDetails, cardHtml) {
    if (!this.transporter) {
      // Preview mode — simulate success
      console.log(`[${this.name}] PREVIEW: would send invite to ${guest.email}`);
      return { success: true, preview: true, message: 'Mail not configured. Preview mode.' };
    }

    try {
      await this.transporter.sendMail({
        from:    process.env.MAIL_FROM || '"HeartBound IQ Weddings" <noreply@HeartBound IQ.com>',
        to:      `"${guest.name}" <${guest.email}>`,
        subject: `✦ You're Invited! ${weddingDetails.brideName} & ${weddingDetails.groomName} — Wedding Invitation`,
        html:    cardHtml,
      });
      console.log(`[${this.name}] Invite sent to ${guest.email}`);
      return { success: true };
    } catch (err) {
      console.error(`[${this.name}] Failed to send to ${guest.email}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // ─── Bulk send to all pending guests ──────────────────────────────────────

  async sendBulkInvites(guests, weddingDetails) {
    console.log(`[${this.name}] Starting bulk invite for ${guests.length} guests…`);
    const html = await cardGen.generate(weddingDetails);

    const results = [];
    for (const guest of guests) {
      const result = await this.sendInvite(guest, weddingDetails, html);
      results.push({ guestId: guest._id, email: guest.email, ...result });
      // Small delay to avoid SMTP rate limits
      await new Promise((r) => setTimeout(r, 300));
    }

    const sent    = results.filter((r) => r.success).length;
    const failed  = results.filter((r) => !r.success).length;
    console.log(`[${this.name}] Bulk done: ${sent} sent, ${failed} failed.`);

    return { sent, failed, results, cardHtml: html };
  }

  // ─── Summary stats ────────────────────────────────────────────────────────

  summarize(guests) {
    const total     = guests.length;
    const confirmed = guests.filter((g) => g.rsvpStatus === 'confirmed').length;
    const declined  = guests.filter((g) => g.rsvpStatus === 'declined').length;
    const pending   = guests.filter((g) => g.rsvpStatus === 'pending').length;
    const invited   = guests.filter((g) => g.inviteSent).length;

    return { total, confirmed, declined, pending, invited };
  }
}

module.exports = new GuestManagementAgent();

