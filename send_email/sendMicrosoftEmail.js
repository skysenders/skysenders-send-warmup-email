const axios = require('axios');
const MailComposer = require('nodemailer/lib/mail-composer');

/**
 * Sends an email using Microsoft Graph REST API.
 * Handles headers and MIME composition in one place.
 */
exports.sendMailWithMicrosoftToken = async (
  { token },
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
  } // Message Object
) => {
  try {
    console.log(`Building Microsoft Graph message for: ${to}`);

    // 1. Setup Privacy Headers
    const customHeaders = {
      'X-Mailer': false,
      'User-Agent': false,
    };

    if (unsubscribeLink && addUnsubscribeTag) {
      customHeaders['List-Unsubscribe'] = `<${unsubscribeLink}>`;
      customHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    // 2. Compose MIME using MailComposer
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


    // set the access token
    options.headers.Authorization = `Bearer ${token.access_token}`;

    // build the raw message
    const raw = await mail.build();

    // eslint-disable-next-line no-undef
    await makeAPIRequest(options, Buffer.from(raw).toString('base64'));

    console.log(`Message sent: ${messageId}  with microsoft API call`);

    return {
      is_sent: true,
      status: 'SENT',
      message: 'Message sent successfully!',
      messageId
    };   

  } catch (e) {
    const errorDetail = e.response?.data?.error?.message || e.message;
    
    // Handle specific Token Expiry
    if (e.response?.status === 401) {
      console.error(`Microsoft Token Expired for ${from}`);
      return { 
        is_sent: false, 
        status: 'TOKEN_EXPIRED', 
        message: 'Access token expired', 
        messageId 
      };
    }

    console.error(`Microsoft API send failed: ${errorDetail}`);
    return {
      is_sent: false,
      status: 'FAILED',
      message: `Microsoft API Error: ${errorDetail}`,
      messageId
    };
  }
};