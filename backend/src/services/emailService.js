import { Resend } from 'resend';
import { addLog } from './loggerService.js';

let resendClient = null;

const BATCH_SIZE = 100;
const DEFAULT_FALLBACK_FROM = 'Innovations Lab <onboarding@resend.dev>';

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
  return process.env.RESEND_FROM_EMAIL || DEFAULT_FALLBACK_FROM;
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
 * Robust bulk email dispatcher leveraging Resend's batch endpoint (client.batch.send).
 * Features:
 * - Chunks large recipient lists into 100-email batches (Resend maximum batch size).
 * - Uses permissive batch validation (batchValidation: 'permissive') so single invalid emails don't fail the batch.
 * - Auto-recovers with fallback onboarding@resend.dev sender if custom domain isn't verified (HTTP 403).
 * - Graceful fallback to concurrent micro-batches if batch API encounters network or schema errors.
 * - Real-time event logging to loggerService.
 */
async function dispatchResendBatchEmails({
  client,
  recipients,
  subject,
  html,
  text = null,
  contextTag = 'Batch Email',
  metadata = {},
}) {
  const validRecipients = Array.from(
    new Set(
      (recipients || [])
        .filter(Boolean)
        .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter(e => e.length > 0 && e.includes('@'))
    )
  );

  if (validRecipients.length === 0) {
    return { success: false, reason: 'No valid recipient email addresses', delivered: 0, total: 0, results: [] };
  }

  const primarySender = getSenderEmail();
  const results = [];

  // Optimized fast-path for single recipient
  if (validRecipients.length === 1) {
    const email = validRecipients[0];
    let activeSender = primarySender;
    try {
      let { data, error } = await client.emails.send({
        from: activeSender,
        to: email,
        subject,
        html,
        ...(text ? { text } : {}),
      });

      // Domain unverified fallback for single email
      if (
        error &&
        (error.statusCode === 403 || error.name === 'validation_error') &&
        activeSender !== DEFAULT_FALLBACK_FROM
      ) {
        addLog('info', `Resend: Sender "${activeSender}" unverified. Retrying single email with sandbox sender "${DEFAULT_FALLBACK_FROM}"...`, {
          email,
          contextTag,
        });
        activeSender = DEFAULT_FALLBACK_FROM;
        const retryRes = await client.emails.send({
          from: activeSender,
          to: email,
          subject,
          html,
          ...(text ? { text } : {}),
        });
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) {
        const errorMsg = error.message || JSON.stringify(error);
        results.push({ email, success: false, error: errorMsg, code: error.name || error.statusCode });
        addLog('fail', `Resend Email failed for ${email}: ${errorMsg}`, {
          email,
          error,
          from: activeSender,
          contextTag,
          ...metadata,
        });
      } else {
        results.push({ email, success: true, id: data?.id });
        addLog('success', `Resend Email delivered to ${email}. MessageId: ${data?.id}`, {
          email,
          messageId: data?.id,
          from: activeSender,
          contextTag,
          ...metadata,
        });
      }
    } catch (err) {
      results.push({ email, success: false, error: err.message });
      addLog('fail', `Resend Email exception for ${email}: ${err.message}`, {
        email,
        error: err.message,
        from: activeSender,
        contextTag,
        ...metadata,
      });
    }

    const successCount = results.filter(r => r.success).length;
    return { success: successCount > 0, delivered: successCount, total: 1, results };
  }

  // Bulk processing in chunks of up to 100 emails
  for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
    const chunk = validRecipients.slice(i, i + BATCH_SIZE);
    let activeSender = primarySender;

    try {
      const buildBatchPayload = (sender) =>
        chunk.map(email => ({
          from: sender,
          to: email,
          subject,
          html,
          ...(text ? { text } : {}),
        }));

      let response = null;
      if (typeof client.batch?.send === 'function') {
        response = await client.batch.send(buildBatchPayload(activeSender), {
          batchValidation: 'permissive',
        });

        // If domain 403 unverified, auto-retry batch with sandbox sender
        if (
          response?.error &&
          (response.error.statusCode === 403 || response.error.name === 'validation_error') &&
          activeSender !== DEFAULT_FALLBACK_FROM
        ) {
          addLog('info', `Resend Batch: Sender "${activeSender}" unverified. Retrying batch of ${chunk.length} with "${DEFAULT_FALLBACK_FROM}"...`, {
            chunkSize: chunk.length,
            contextTag,
          });
          activeSender = DEFAULT_FALLBACK_FROM;
          response = await client.batch.send(buildBatchPayload(activeSender), {
            batchValidation: 'permissive',
          });
        }
      }

      // Check if batch succeeded
      if (response && !response.error && response.data) {
        // Resend batch response structure: { data: [ { id: '...' } ], errors?: [ { index: 0, message: '...' } ] }
        const resData = response.data;
        const sentItems = Array.isArray(resData.data) ? resData.data : (Array.isArray(resData) ? resData : []);
        const failedErrors = Array.isArray(resData.errors) ? resData.errors : [];
        const errorMap = new Map(failedErrors.map(e => [e.index, e.message]));

        chunk.forEach((email, idx) => {
          if (errorMap.has(idx)) {
            const errStr = errorMap.get(idx);
            results.push({ email, success: false, error: errStr });
            addLog('fail', `Resend Email failed for ${email}: ${errStr}`, {
              email,
              error: errStr,
              from: activeSender,
              contextTag,
              ...metadata,
            });
          } else {
            const messageId = sentItems[idx]?.id || `batch-${Date.now()}-${idx}`;
            results.push({ email, success: true, id: messageId });
            addLog('success', `Resend Email delivered to ${email}. MessageId: ${messageId}`, {
              email,
              messageId,
              from: activeSender,
              contextTag,
              ...metadata,
            });
          }
        });
      } else {
        const batchErrorObj = response?.error;
        const batchErrorMsg = batchErrorObj ? (batchErrorObj.message || JSON.stringify(batchErrorObj)) : 'Batch API unavailable';
        const isAuthError = batchErrorObj && (batchErrorObj.statusCode === 401 || batchErrorObj.name === 'missing_api_key' || batchErrorMsg.toLowerCase().includes('api key') || batchErrorMsg.toLowerCase().includes('unauthorized'));

        if (isAuthError) {
          addLog('fail', `Resend Batch authentication error: ${batchErrorMsg}`, {
            chunkSize: chunk.length,
            contextTag,
            ...metadata,
          });
          chunk.forEach(email => {
            results.push({ email, success: false, error: batchErrorMsg });
          });
        } else {
          // Fallback to micro-concurrent dispatch for transient batch API issues
          addLog('info', `Resend Batch fallback engaged: ${batchErrorMsg}. Dispatching micro-batches...`, {
            chunkSize: chunk.length,
            contextTag,
          });

          // Send micro-chunks of 5 concurrently with 300ms delays to respect rate-limits
          const microChunkSize = 5;
          for (let m = 0; m < chunk.length; m += microChunkSize) {
            const microChunk = chunk.slice(m, m + microChunkSize);
            await Promise.allSettled(
              microChunk.map(async (email) => {
                try {
                  let singleRes = await client.emails.send({
                    from: activeSender,
                    to: email,
                    subject,
                    html,
                    ...(text ? { text } : {}),
                  });
                  if (
                    singleRes.error &&
                    (singleRes.error.statusCode === 403 || singleRes.error.name === 'validation_error') &&
                    activeSender !== DEFAULT_FALLBACK_FROM
                  ) {
                    activeSender = DEFAULT_FALLBACK_FROM;
                    singleRes = await client.emails.send({
                      from: activeSender,
                      to: email,
                      subject,
                      html,
                      ...(text ? { text } : {}),
                    });
                  }

                  if (singleRes.error) {
                    const errorMsg = singleRes.error.message || JSON.stringify(singleRes.error);
                    results.push({ email, success: false, error: errorMsg });
                    addLog('fail', `Resend Email failed for ${email}: ${errorMsg}`, {
                      email,
                      from: activeSender,
                      contextTag,
                      ...metadata,
                    });
                  } else {
                    results.push({ email, success: true, id: singleRes.data?.id });
                    addLog('success', `Resend Email delivered to ${email}. MessageId: ${singleRes.data?.id}`, {
                      email,
                      messageId: singleRes.data?.id,
                      from: activeSender,
                      contextTag,
                      ...metadata,
                    });
                  }
                } catch (singleErr) {
                  results.push({ email, success: false, error: singleErr.message });
                  addLog('fail', `Resend Email exception for ${email}: ${singleErr.message}`, {
                    email,
                    from: activeSender,
                    contextTag,
                    ...metadata,
                  });
                }
              })
            );

            if (m + microChunkSize < chunk.length) {
              await new Promise(r => setTimeout(r, 300));
            }
          }
        }
      }
    } catch (chunkErr) {
      addLog('fail', `Resend Batch exception for chunk starting at ${i}: ${chunkErr.message}`, {
        chunkSize: chunk.length,
        contextTag,
        ...metadata,
      });
      chunk.forEach(email => {
        results.push({ email, success: false, error: chunkErr.message });
      });
    }

    // Inter-batch pacing to stay within rate limits for very large classes
    if (i + BATCH_SIZE < validRecipients.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const successCount = results.filter(r => r.success).length;
  addLog(
    successCount > 0 ? (successCount === validRecipients.length ? 'success' : 'fail') : 'fail',
    `Resend Email: Delivered ${successCount}/${validRecipients.length} recipients for "${contextTag}"`,
    { contextTag, from: primarySender, ...metadata, totalRecipients: validRecipients.length, successCount }
  );

  return { success: successCount > 0, delivered: successCount, total: validRecipients.length, results };
}

/**
 * Sends meeting live or scheduled email to an attendee or list of attendees via Resend batch API
 */
async function dispatchResendBatchEmails({
  client,
  recipients,
  subject,
  html,
  text = null,
  contextTag = 'Batch Email',
  metadata = {},
}) {
  const validRecipients = Array.from(
    new Set(
      (recipients || [])
        .filter(Boolean)
        .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter(e => e.length > 0 && e.includes('@'))
    )
  );

  if (validRecipients.length === 0) {
    return { success: false, reason: 'No valid recipient email addresses', delivered: 0, total: 0, results: [] };
  }

  const primarySender = getSenderEmail();
  const results = [];

  // Optimized fast-path for single recipient
  if (validRecipients.length === 1) {
    const email = validRecipients[0];
    let activeSender = primarySender;
    try {
      let { data, error } = await client.emails.send({
        from: activeSender,
        to: email,
        subject,
        html,
        ...(text ? { text } : {}),
      });

      // Domain unverified fallback for single email
      if (
        error &&
        (error.statusCode === 403 || error.name === 'validation_error') &&
        activeSender !== DEFAULT_FALLBACK_FROM
      ) {
        addLog('info', `Resend: Sender "${activeSender}" unverified. Retrying single email with sandbox sender "${DEFAULT_FALLBACK_FROM}"...`, {
          email,
          contextTag,
        });
        activeSender = DEFAULT_FALLBACK_FROM;
        const retryRes = await client.emails.send({
          from: activeSender,
          to: email,
          subject,
          html,
          ...(text ? { text } : {}),
        });
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) {
        const errorMsg = error.message || JSON.stringify(error);
        results.push({ email, success: false, error: errorMsg, code: error.name || error.statusCode });
        addLog('fail', `Resend Email failed for ${email}: ${errorMsg}`, {
          email,
          error,
          from: activeSender,
          contextTag,
          ...metadata,
        });
      } else {
        results.push({ email, success: true, id: data?.id });
        addLog('success', `Resend Email delivered to ${email}. MessageId: ${data?.id}`, {
          email,
          messageId: data?.id,
          from: activeSender,
          contextTag,
          ...metadata,
        });
      }
    } catch (err) {
      results.push({ email, success: false, error: err.message });
      addLog('fail', `Resend Email exception for ${email}: ${err.message}`, {
        email,
        error: err.message,
        from: activeSender,
        contextTag,
        ...metadata,
      });
    }

    const successCount = results.filter(r => r.success).length;
    return { success: successCount > 0, delivered: successCount, total: 1, results };
  }

  // Bulk processing in chunks of up to 100 emails
  for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
    const chunk = validRecipients.slice(i, i + BATCH_SIZE);
    let activeSender = primarySender;

    try {
      const buildBatchPayload = (sender) =>
        chunk.map(email => ({
          from: sender,
          to: email,
          subject,
          html,
          ...(text ? { text } : {}),
        }));

      let response = null;
      if (typeof client.batch?.send === 'function') {
        response = await client.batch.send(buildBatchPayload(activeSender), {
          batchValidation: 'permissive',
        });

        // If domain 403 unverified, auto-retry batch with sandbox sender
        if (
          response?.error &&
          (response.error.statusCode === 403 || response.error.name === 'validation_error') &&
          activeSender !== DEFAULT_FALLBACK_FROM
        ) {
          addLog('info', `Resend Batch: Sender "${activeSender}" unverified. Retrying batch of ${chunk.length} with "${DEFAULT_FALLBACK_FROM}"...`, {
            chunkSize: chunk.length,
            contextTag,
          });
          activeSender = DEFAULT_FALLBACK_FROM;
          response = await client.batch.send(buildBatchPayload(activeSender), {
            batchValidation: 'permissive',
          });
        }
      }

      // Check if batch succeeded
      if (response && !response.error && response.data) {
        // Resend batch response structure: { data: [ { id: '...' } ], errors?: [ { index: 0, message: '...' } ] }
        const resData = response.data;
        const sentItems = Array.isArray(resData.data) ? resData.data : (Array.isArray(resData) ? resData : []);
        const failedErrors = Array.isArray(resData.errors) ? resData.errors : [];
        const errorMap = new Map(failedErrors.map(e => [e.index, e.message]));

        chunk.forEach((email, idx) => {
          if (errorMap.has(idx)) {
            const errStr = errorMap.get(idx);
            results.push({ email, success: false, error: errStr });
            addLog('fail', `Resend Email failed for ${email}: ${errStr}`, {
              email,
              error: errStr,
              from: activeSender,
              contextTag,
              ...metadata,
            });
          } else {
            const messageId = sentItems[idx]?.id || `batch-${Date.now()}-${idx}`;
            results.push({ email, success: true, id: messageId });
            addLog('success', `Resend Email delivered to ${email}. MessageId: ${messageId}`, {
              email,
              messageId,
              from: activeSender,
              contextTag,
              ...metadata,
            });
          }
        });
      } else {
        // Batch API returned an error or is unavailable: Fallback to micro-concurrent dispatch
        const batchError = response?.error ? (response.error.message || JSON.stringify(response.error)) : 'Batch API unavailable';
        addLog('info', `Resend Batch fallback engaged: ${batchError}. Dispatching micro-batches...`, {
          chunkSize: chunk.length,
          contextTag,
        });

        // Send micro-chunks of 5 concurrently with 300ms delays to respect rate-limits
        const microChunkSize = 5;
        for (let m = 0; m < chunk.length; m += microChunkSize) {
          const microChunk = chunk.slice(m, m + microChunkSize);
          await Promise.allSettled(
            microChunk.map(async (email) => {
              try {
                let singleRes = await client.emails.send({
                  from: activeSender,
                  to: email,
                  subject,
                  html,
                  ...(text ? { text } : {}),
                });
                if (
                  singleRes.error &&
                  (singleRes.error.statusCode === 403 || singleRes.error.name === 'validation_error') &&
                  activeSender !== DEFAULT_FALLBACK_FROM
                ) {
                  activeSender = DEFAULT_FALLBACK_FROM;
                  singleRes = await client.emails.send({
                    from: activeSender,
                    to: email,
                    subject,
                    html,
                    ...(text ? { text } : {}),
                  });
                }

                if (singleRes.error) {
                  const errorMsg = singleRes.error.message || JSON.stringify(singleRes.error);
                  results.push({ email, success: false, error: errorMsg });
                  addLog('fail', `Resend Email failed for ${email}: ${errorMsg}`, {
                    email,
                    from: activeSender,
                    contextTag,
                    ...metadata,
                  });
                } else {
                  results.push({ email, success: true, id: singleRes.data?.id });
                  addLog('success', `Resend Email delivered to ${email}. MessageId: ${singleRes.data?.id}`, {
                    email,
                    messageId: singleRes.data?.id,
                    from: activeSender,
                    contextTag,
                    ...metadata,
                  });
                }
              } catch (singleErr) {
                results.push({ email, success: false, error: singleErr.message });
                addLog('fail', `Resend Email exception for ${email}: ${singleErr.message}`, {
                  email,
                  from: activeSender,
                  contextTag,
                  ...metadata,
                });
              }
            })
          );

          if (m + microChunkSize < chunk.length) {
            await new Promise(r => setTimeout(r, 300));
          }
        }
      }
    } catch (chunkErr) {
      addLog('fail', `Resend Batch exception for chunk starting at ${i}: ${chunkErr.message}`, {
        chunkSize: chunk.length,
        contextTag,
        ...metadata,
      });
      chunk.forEach(email => {
        results.push({ email, success: false, error: chunkErr.message });
      });
    }

    // Inter-batch pacing to stay within rate limits for very large classes
    if (i + BATCH_SIZE < validRecipients.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const successCount = results.filter(r => r.success).length;
  addLog(
    successCount > 0 ? (successCount === validRecipients.length ? 'success' : 'fail') : 'fail',
    `Resend Email: Delivered ${successCount}/${validRecipients.length} recipients for "${contextTag}"`,
    { contextTag, from: primarySender, ...metadata, totalRecipients: validRecipients.length, successCount }
  );

  return { success: successCount > 0, delivered: successCount, total: validRecipients.length, results };
}

/**
 * Sends meeting live or scheduled email to an attendee or list of attendees via Resend batch API
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

  const html = wrapHtml(title, preheader, bodyHtml, {
    text: isLive ? 'Open App & Check In Now' : 'View Session Details',
    url: appUrl,
  });

  return await dispatchResendBatchEmails({
    client,
    recipients,
    subject: title,
    html,
    contextTag: `Session: ${sessionTitle}`,
    metadata: { alertType, sessionTitle, room, coordinatorName },
  });
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

  let sendFrom = getSenderEmail();
  try {
    let { data, error } = await client.emails.send({
      from: sendFrom,
      to,
      subject: title,
      html: wrapHtml(title, preheader, bodyHtml, {
        text: 'View Attendance History',
        url: `${appUrl}/student/history`,
      }),
    });

    if (
      error &&
      (error.statusCode === 403 || error.name === 'validation_error') &&
      sendFrom !== DEFAULT_FALLBACK_FROM
    ) {
      addLog('info', `Resend: Sender "${sendFrom}" unverified. Retrying correction decision with "${DEFAULT_FALLBACK_FROM}"...`, {
        to,
      });
      sendFrom = DEFAULT_FALLBACK_FROM;
      const retryRes = await client.emails.send({
        from: sendFrom,
        to,
        subject: title,
        html: wrapHtml(title, preheader, bodyHtml, {
          text: 'View Attendance History',
          url: `${appUrl}/student/history`,
        }),
      });
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      const errorMsg = error.message || JSON.stringify(error);
      addLog('fail', `Resend Email: Failed sending correction decision to ${to}: ${errorMsg}`, {
        to,
        error,
        from: sendFrom,
      });
      return { success: false, error: errorMsg };
    }

    addLog('success', `Resend Email: Correction decision sent to ${to} (${status}). MessageId: ${data?.id}`, {
      to,
      status,
      messageId: data?.id,
      from: sendFrom,
    });
    return { success: true, messageId: data?.id };
  } catch (err) {
    addLog('fail', `Resend Email: Exception sending correction decision to ${to}: ${err.message}`, {
      to,
      error: err.message,
      from: sendFrom,
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

  let sendFrom = getSenderEmail();
  let { data, error } = await client.emails.send({
    from: sendFrom,
    to: toEmail,
    subject: title,
    html: wrapHtml(title, preheader, bodyHtml),
  });

  if (
    error &&
    (error.statusCode === 403 || error.name === 'validation_error') &&
    sendFrom !== DEFAULT_FALLBACK_FROM
  ) {
    addLog('info', `Resend: Sender "${sendFrom}" unverified. Retrying test email with sandbox sender "${DEFAULT_FALLBACK_FROM}"...`, {
      to: toEmail,
    });
    sendFrom = DEFAULT_FALLBACK_FROM;
    const retryRes = await client.emails.send({
      from: sendFrom,
      to: toEmail,
      subject: title,
      html: wrapHtml(title, preheader, bodyHtml),
    });
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error) {
    const errorMsg = error.message || JSON.stringify(error);
    addLog('fail', `Resend Email: Test email to ${toEmail} rejected: ${errorMsg}`, {
      to: toEmail,
      error,
      from: sendFrom,
    });
    throw new Error(errorMsg);
  }

  addLog('success', `Resend Email: Test email sent to ${toEmail}. MessageId: ${data?.id}`, {
    to: toEmail,
    messageId: data?.id,
    from: sendFrom,
  });

  return { success: true, messageId: data?.id, from: sendFrom };
}

/**
 * Sends check-in / check-out / dispute alert email to coordinators via Resend batch API
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

  const html = wrapHtml(title, preheader, bodyHtml, {
    text: 'Open Coordinator Dashboard',
    url: `${appUrl}/coordinator`,
  });

  return await dispatchResendBatchEmails({
    client,
    recipients,
    subject: title,
    html,
    contextTag: `Coordinator Alert: ${type}`,
    metadata: { type, studentName, sessionTitle, status },
  });
}

/**
 * Broadcasts a custom announcement or notification to a list of recipients via Resend batch API
 */
export async function sendBulkBroadcastEmail({
  recipients,
  subject,
  title,
  message,
  actionButton = null,
  appUrl = 'https://labs-pyi3.onrender.com',
}) {
  const client = getResendClient();
  if (!client || !recipients || recipients.length === 0) {
    return { success: false, reason: 'Resend not configured or empty recipients' };
  }

  const heading = title || subject || 'Innovations Lab Announcement';
  const preheader = (message || '').replace(/<[^>]*>?/gm, '').substring(0, 120);

  const bodyHtml = `
    <div style="font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 16px;">
      ${message}
    </div>
  `;

  const html = wrapHtml(heading, preheader, bodyHtml, actionButton);

  return await dispatchResendBatchEmails({
    client,
    recipients,
    subject,
    html,
    contextTag: `Broadcast: ${heading}`,
    metadata: { subject, title: heading },
  });
}
