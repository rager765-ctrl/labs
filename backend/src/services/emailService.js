import { Resend } from 'resend';
import { addLog } from './loggerService.js';

let resendClient = null;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export function getSenderEmail() {
  return process.env.RESEND_FROM_EMAIL || 'Innovations Lab <onboarding@resend.dev>';
}

/**
 * Base email wrapper template with clean modern styles matching Innovations Lab tokens
 */
function wrapHtml(title, preheader, bodyHtml, actionButton = null) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <span style="display: none; max-height: 0px; overflow: hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 32px; text-align: left;">
              <div style="font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 0.08em; text-transform: uppercase;">
                Innovations Lab Attendance
              </div>
              <h1 style="margin: 6px 0 0; color: #FFFFFF; font-size: 20px; font-weight: 700; line-height: 26px;">
                ${title}
              </h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              ${bodyHtml}
              ${
                actionButton
                  ? `
                <div style="margin-top: 32px; text-align: center;">
                  <a href="${actionButton.url}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                    ${actionButton.text}
                  </a>
                </div>
              `
                  : ''
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; line-height: 18px;">
              This is an automated notification from Innovations Lab Attendance system.<br>
              To change your email preferences, visit your attendee or coordinator profile in the app.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends meeting live or scheduled email to an attendee or list of attendees
 */
export async function sendSessionAlertEmail({
  recipients,
  sessionTitle,
  room,
  coordinatorName,
  alertType = 'session_live',
  appUrl = 'https://labs-pyi3.onrender.com',
}) {
  const client = getResendClient();
  if (!client || !recipients || recipients.length === 0) {
    return { success: false, reason: 'Resend client not configured or recipient list empty' };
  }

  const validRecipients = Array.from(new Set(recipients.filter(Boolean)));
  if (validRecipients.length === 0) return { success: false, reason: 'No valid recipient emails' };

  const isLive = alertType === 'session_live';
  const title = isLive ? `🔴 Meeting Live: ${sessionTitle}` : `📅 Meeting Scheduled: ${sessionTitle}`;
  const preheader = isLive
    ? `Check-in is now open at ${room || 'the lab'}. Tap to record your attendance.`
    : `A new session "${sessionTitle}" was scheduled at ${room || 'the lab'}.`;

  const bodyHtml = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #334155;">
      ${
        isLive
          ? `<strong>${sessionTitle}</strong> is now <span style="color: #DC2626; font-weight: 700;">LIVE</span> at ${room || 'the lab'}. Attendance check-in is currently open.`
          : `A meeting session <strong>"${sessionTitle}"</strong> has been scheduled.`
      }
    </p>

    <div style="background-color: #F1F5F9; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #CBD5E1;">
      <table style="width: 100%; font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 4px 0; font-weight: 600; width: 110px;">Meeting:</td>
          <td style="padding: 4px 0;">${sessionTitle}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 600;">Location:</td>
          <td style="padding: 4px 0;">${room || 'Innovations Lab'}</td>
        </tr>
        ${
          coordinatorName
            ? `<tr>
          <td style="padding: 4px 0; font-weight: 600;">Host:</td>
          <td style="padding: 4px 0;">${coordinatorName}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding: 4px 0; font-weight: 600;">Status:</td>
          <td style="padding: 4px 0;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: ${
              isLive ? '#FEE2E2; color: #991B1B;' : '#E0E7FF; color: #3730A3;'
            }">
              ${isLive ? 'LIVE NOW' : 'SCHEDULED'}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 14px; color: #64748B;">
      ${
        isLive
          ? 'Open the app on your mobile or desktop browser to scan the session QR code or verify your attendance.'
          : 'Be on time for the meeting. Check-in opens 15 minutes before start.'
      }
    </p>
  `;

  const results = [];
  // Resend allows sending batch or individual
  for (const email of validRecipients) {
    try {
      const resp = await client.emails.send({
        from: getSenderEmail(),
        to: email,
        subject: title,
        html: wrapHtml(title, preheader, bodyHtml, {
          text: isLive ? 'Open App & Check In Now' : 'View Session Details',
          url: appUrl,
        }),
      });
      results.push({ email, success: true, id: resp.data?.id });
    } catch (err) {
      results.push({ email, success: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  addLog(
    successCount > 0 ? 'success' : 'fail',
    `Resend Email: Sent session alert to ${successCount}/${validRecipients.length} recipients for "${sessionTitle}"`,
    { alertType, sessionTitle, results }
  );

  return { success: successCount > 0, delivered: successCount, total: validRecipients.length, results };
}

/**
 * Sends attendance dispute/correction resolution email to student
 */
export async function sendCorrectionDecisionEmail({
  to,
  studentName,
  sessionTitle,
  status, // 'approved' | 'rejected' | 'resolved'
  decisionReason,
  appUrl = 'https://labs-pyi3.onrender.com',
}) {
  const client = getResendClient();
  if (!client || !to) return { success: false, reason: 'Resend not configured or missing recipient' };

  const isApproved = status === 'approved' || status === 'resolved';
  const title = isApproved
    ? `✅ Attendance Correction Approved: ${sessionTitle}`
    : `❌ Attendance Correction Update: ${sessionTitle}`;
  const preheader = `Your attendance correction request for ${sessionTitle} has been ${status}.`;

  const bodyHtml = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #334155;">
      Hello ${studentName || 'Attendee'},
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #334155;">
      Your attendance correction request for <strong>"${sessionTitle}"</strong> was reviewed by the lab coordinator and has been marked as
      <strong style="color: ${isApproved ? '#16A34A' : '#DC2626'};">${status.toUpperCase()}</strong>.
    </p>

    ${
      decisionReason
        ? `
      <div style="background-color: #F8FAFC; border-left: 4px solid ${
        isApproved ? '#16A34A' : '#DC2626'
      }; padding: 12px 16px; margin: 18px 0; font-size: 13px; color: #475569;">
        <strong>Coordinator Note:</strong><br>
        ${decisionReason}
      </div>
    `
        : ''
    }

    <p style="margin: 16px 0 0; font-size: 14px; color: #64748B;">
      Your attendance record and metrics have been refreshed in your profile history.
    </p>
  `;

  try {
    const resp = await client.emails.send({
      from: getSenderEmail(),
      to,
      subject: title,
      html: wrapHtml(title, preheader, bodyHtml, {
        text: 'View Attendance History',
        url: `${appUrl}/student/history`,
      }),
    });

    addLog('success', `Resend Email: Correction decision sent to ${to} (${status})`, {
      to,
      status,
      messageId: resp.data?.id,
    });
    return { success: true, messageId: resp.data?.id };
  } catch (err) {
    addLog('fail', `Resend Email: Failed sending correction decision to ${to}: ${err.message}`, {
      to,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

/**
 * Sends a test email to verify Resend setup
 */
export async function sendTestEmail(toEmail) {
  const client = getResendClient();
  if (!client) {
    throw new Error('Resend API key is not configured. Add RESEND_API_KEY in environment variables.');
  }

  const title = '🔔 Test Email from Innovations Lab';
  const preheader = 'Your Resend email notification service is connected and working!';
  const bodyHtml = `
    <p style="font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 16px;">
      Congratulations! Your <strong>Resend Email Integration</strong> is active and connected with the Innovations Lab Attendance platform.
    </p>
    <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px; margin: 20px 0; color: #065F46; font-size: 13px;">
      ✅ <strong>Email Pipeline Verified:</strong> You can now dispatch automated meeting announcements, attendance notifications, and correction approvals via Resend.
    </div>
  `;

  const resp = await client.emails.send({
    from: getSenderEmail(),
    to: toEmail,
    subject: title,
    html: wrapHtml(title, preheader, bodyHtml),
  });

  addLog('success', `Resend Email: Test email sent to ${toEmail}. MessageId: ${resp.data?.id}`, {
    to: toEmail,
    messageId: resp.data?.id,
  });

  return { success: true, messageId: resp.data?.id };
}

/**
 * Sends check-in / check-out / dispute alert email to coordinators
 */
export async function sendCoordinatorAlertEmail({
  recipients,
  type,
  studentName,
  sessionTitle,
  status,
  appUrl = 'https://labs-pyi3.onrender.com',
}) {
  const client = getResendClient();
  if (!client || !recipients || recipients.length === 0) {
    return { success: false, reason: 'Resend not configured or empty recipients' };
  }

  const validRecipients = Array.from(new Set(recipients.filter(Boolean)));
  if (validRecipients.length === 0) return { success: false, reason: 'No valid recipient emails' };

  let title = `Lab Alert: ${studentName || 'Attendee'}`;
  if (type === 'checkin') {
    title = `🟢 Check-in Alert: ${studentName || 'Student'} (${status || 'Present'})`;
  } else if (type === 'checkout') {
    title = `🔵 Check-out Alert: ${studentName || 'Student'}`;
  } else if (type === 'correction_submitted') {
    title = `⚖️ Issue Request: ${studentName || 'Student'}`;
  }

  const preheader = `Activity in session "${sessionTitle || 'Lab'}": ${studentName || 'Attendee'}`;
  const bodyHtml = `
    <p style="font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 16px;">
      Hello Coordinator,
    </p>
    <p style="font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 16px;">
      A new attendance event occurred in <strong>"${sessionTitle || 'Session'}"</strong>:
    </p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
      <div><strong>Student:</strong> ${studentName || 'Attendee'}</div>
      <div style="margin-top: 6px;"><strong>Event Type:</strong> ${type}</div>
      ${status ? `<div style="margin-top: 6px;"><strong>Status:</strong> ${status}</div>` : ''}
    </div>
  `;

  const results = [];
  for (const email of validRecipients) {
    try {
      const resp = await client.emails.send({
        from: getSenderEmail(),
        to: email,
        subject: title,
        html: wrapHtml(title, preheader, bodyHtml, {
          text: 'Open Coordinator Dashboard',
          url: `${appUrl}/coordinator`,
        }),
      });
      results.push({ email, success: true, id: resp.data?.id });
    } catch (err) {
      results.push({ email, success: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  addLog(
    successCount > 0 ? 'success' : 'fail',
    `Resend Email: Sent coordinator alert (${type}) to ${successCount}/${validRecipients.length} coordinator(s)`,
    { type, studentName, sessionTitle, results }
  );

  return { success: successCount > 0, delivered: successCount, total: validRecipients.length, results };
}
