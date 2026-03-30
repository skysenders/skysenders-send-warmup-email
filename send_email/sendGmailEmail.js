const axios = require('axios');
const MailComposer = require('nodemailer/lib/mail-composer');

/**
 * Sends an email using Gmail REST API via direct Axios call.
 * This assumes token management/refreshing is handled by an external service.
 */
exports.sendMailWithGmailAPI = async (
  { token }, // Token object containing access_token
  {
    from,
    to,
    subject,
    messageInText,
    messageInHtml,
    messageId,
    replyTo,
    inReplyTo,
    references,
    bcc,
    attachments,
    unsubscribeLink,
    addUnsubscribeTag
  }
) => {
  try {
    console.log(`Building Gmail API message for: ${to} using REST`);

    // 1. Setup Privacy Headers (Removing Nodemailer footprint)
    const customHeaders = {
      'X-Mailer': false,
      'User-Agent': false,
    };

    if (unsubscribeLink && addUnsubscribeTag) {
      customHeaders['List-Unsubscribe'] = `<${unsubscribeLink}>`;
      customHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    // 2. Compose the MIME message using Nodemailer Composer
    const mail = new MailComposer({
      from,
      to,
      bcc,
      subject,
      text: messageInText || '',
      html: messageInHtml,
      attachments,
      messageId,
      replyTo: replyTo || from,
      inReplyTo,
      references,
      headers: customHeaders,
      keepBcc: true,
      priority: 'normal'
    }).compile();

    const rawBuffer = await mail.build();

    // 3. Encode to Base64URL (Strictly required by Gmail API)
    const encodedMessage = rawBuffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 4. Direct Axios POST to Gmail API
    const res = await axios({
      method: 'POST',
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      data: {
        raw: encodedMessage,
      },
    });

    return {
      is_sent: true,
      message: 'Email sent successfully via Gmail API',
      messageId: res.data.id,
      threadId: res.data.threadId
    };

  } catch (e) {
    const errorDetail = e.response?.data?.error?.message || e.message;
    
    // Check if token is expired (401 Unauthorized)
    if (e.response?.status === 401) {
      console.error(`Gmail Token Expired for ${from}: ${errorDetail}`);
      return {
        is_sent: false,
        status: 'TOKEN_EXPIRED',
        message: 'The access token has expired or is invalid.',
        messageId
      };
    }

    console.error(`Gmail REST API send failed: ${errorDetail}`);
    return {
      is_sent: false,
      message: `Gmail API Error: ${errorDetail}`,
      messageId
    };
  }
};