const axios = require('axios');
const MailComposer = require('nodemailer/lib/mail-composer');
const nodemailer = require('nodemailer');

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
      'X-Mailer': '',
      'User-Agent': '',
    };

    if (unsubscribeLink && addUnsubscribeTag) {
      customHeaders['List-Unsubscribe'] = `<${unsubscribeLink}>`;
      customHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
    
    // create transporter using Gmail SMTP with OAuth2 (fallback for token issues)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: from,
        accessToken: token.access_token,
      },
    });

    const info = await transporter.sendMail({
      from,
      to,
      bcc,
      subject,
      text: messageInText || '',
      html: messageInHtml,
      attachments,
      messageId,
      keepBcc: true,
      replyTo: replyTo || from,
      inReplyTo,
      references,
      priority: 'normal',
      headers: customHeaders,
    });

    console.log(`Email sent via Gmail SMTP for: ${to} with messageId: ${messageId}`);

    return {
      ...info,
      is_sent: true,
      message: 'Email sent successfully via Gmail SMTP',
      messageId
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