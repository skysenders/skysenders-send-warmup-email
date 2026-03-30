const { sendSMTPMail } = require('./sendSMTPEmail');
const { sendMailWithGmailAPI } = require('./sendGmailEmail');
const { sendMailWithMicrosoftToken } = require('./sendMicrosoftEmail');

/**
 * Main entry point for sending emails. 
 * Automatically routes to Gmail API, Microsoft Graph, or SMTP based on 'type'.
 */
exports.sendMail = async (
  { 
    mailboxId, 
    userId,
    host, 
    port, 
    authuser, 
    authpass, 
    token, 
    type = 'SMTP', 
  }, 
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
    attachments, // Added to support files
    unsubscribeLink, 
    addUnsubscribeTag 
  }
) => {
  const messageData = { 
    from, to, subject, messageInText, messageInHtml, messageId, 
    replyTo, inReplyTo, references, bcc, attachments, 
    unsubscribeLink, addUnsubscribeTag 
  };

  try {
    // 1. Route to Gmail API
    if ((type === 'GMAIL' || type === 'GOOGLE') && token) {
      return await sendMailWithGmailAPI(
        { token }, 
        messageData
      );
    }

    // 2. Route to Microsoft/Outlook API
    if ((type === 'OUTLOOK' || type === 'MICROSOFT') && token) {
      return await sendMailWithMicrosoftToken(
        { token }, 
        messageData
      );
    }

    // 3. Fallback to Standard SMTP
    if (host && port && authuser && authpass) {
      return await sendSMTPMail(
        { host, port, authuser, authpass }, 
        messageData
      );
    }

    // 4. Failure case: Missing credentials
    console.error(`SendMail Failure: No valid credentials for account ${mailboxId} (Type: ${type}) user: ${userId}`);
    return {
      is_sent: false,
      status: 'FAILED',
      message: 'Email account does not have proper credentials/details to send emails.',
      messageId
    };

  } catch (error) {
    console.error(`Abstract SendMail Error: ${error.message}`);
    return {
      is_sent: false,
      status: 'FAILED',
      message: `Internal Routing Error: ${error.message}`,
      messageId
    };
  }
};