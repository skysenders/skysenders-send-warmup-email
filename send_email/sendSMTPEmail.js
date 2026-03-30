const nodemailer = require('nodemailer');

exports.sendSMTPMail = async (
  { host, port, authuser, authpass },
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

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: authuser,
        pass: authpass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    console.log(`Sending email to: ${to}`);

    // initialize headers with default values
    const headers = {
        'X-Mailer': false,
        'User-Agent': false,
      };

    if (unsubscribeLink && addUnsubscribeTag) {
      headers['List-Unsubscribe'] = `<${unsubscribeLink}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const finalMessageId = messageId;

    const info = await transporter.sendMail({
      from,
      to,
      bcc,
      subject,
      text: messageInText || '',
      html: messageInHtml,
      attachments,
      messageId: finalMessageId,
      keepBcc: true,
      replyTo: replyTo || from,
      inReplyTo,
      references,
      priority: 'normal',
      headers,
    });

    return {
      ...info,
      is_sent: true,
      message: 'Email sent successfully',
      messageId: finalMessageId
    };

  } catch (e) {
    console.error(`SMTP send failed for ${authuser}: ${e.message}`);

    return {
      is_sent: false,
      message: `Error: ${e.message} \n Mailbox used: ${from}`,
      messageId
    };
  }
};