const {
  fetchSenderDetails,
  fetchWarmupMessageById,
  fetchWarmupIdentifier,
  updateWarmupStats,
  deleteWarmupReplyTriggers,
  handleSenderFailureErrors,
  handleMailboxForwardingErrors,
  resetMailboxDisconnectStage
} = require("../backend.client");

const { sendMail } = require("../send_email/index");
const { buildWarmupTemplateData, compileHandlebarsTemplate } = require("../utils/handlebars.utils");
const { getRandomReplyTime } = require("../utils/time.utils");
const { generateMessageId } = require("../utils/stringhelper");

async function processReply(payload) {
  
  // extract necessary fields from payload
  const {
    from_user_id,
    from_mailbox_id,
    to_user_id,
    to_mailbox_id,
    message_id,
    message_ref_id,
    reply_count,
  } = payload;

  console.log("Processing warmup reply for from_user_id:", from_user_id, "to_user_id:", to_user_id, "message_ref_id:", message_ref_id, "reply_count:", reply_count);

  // fetch sender, receiver, and warmup message content in parallel
  const [sender, receiver, content] = await Promise.all([
    fetchSenderDetails(from_user_id, from_mailbox_id),
    fetchSenderDetails(to_user_id, to_mailbox_id),
    fetchWarmupMessageById(message_ref_id),
  ]);

  // if any of the required data is missing, throw an error
  if (!sender || !receiver || !content) throw new Error("Missing data");
  
  let subject = `RE: ${content.subject}`;
  let body = content[`reply_body_${reply_count}`];
  
  // if there's no content for the current reply count, 
  // it means the conversation has ended, so we can delete any existing triggers and exit
  if (!body) {
    await deleteWarmupReplyTriggers(payload.id);
    return;
  }

  // fetch the warmup identifier for both sender and receiver
  const identifiers = await fetchWarmupIdentifier(
    sender.user_id,
    sender.id,
    receiver.user_id,
    receiver.id
  );

  // build the email content using Handlebars templates
  const templateData = buildWarmupTemplateData(sender, receiver, identifiers);
  subject = compileHandlebarsTemplate(subject, buildWarmupTemplateData(receiver, sender, identifiers));
  body = compileHandlebarsTemplate(body, templateData);

  // generate messageId
  const messageId = generateMessageId(receiver.user_id, receiver.id, sender.id, sender.email, 'R');
  
  console.log("Sending warmup reply email from:", sender.email, "to:", receiver.email, "with messageId:", message_id);
  // send the email using the sender's SMTP credentials
  const result = await sendMail({
    mailboxId: sender.id,
    userId: sender.user_id,
    host: sender.smtp_details?.host,
    port: sender.smtp_details?.port,
    authuser: sender.smtp_details?.authuser,
    authpass: sender.smtp_details?.authpass,
    token: sender.token,
    type: sender.esp_type,
  },
  {
    from: sender.email,
    to: receiver.email,
    subject: subject,
    messageInText: body,
    messageInHtml: `<p>${body.replace(/\n/g, "<br>")}</p>`,
    messageId,
    replyTo: sender.email,
inReplyTo: message_id,
references: [message_id],
  });

  if(result.is_sent) {
    // determine if we should schedule the next reply based on the reply rate and daily target
    const nextReplyExists = !!content[`reply_body_${reply_count + 1}`];
    const replyTime = nextReplyExists ? getRandomReplyTime() : null;

    console.log("Updating the warmup message details:", result.messageId, "Next reply exists:", nextReplyExists, "Reply time for next reply (if exists):", replyTime);
    // update warmup stats and delete any existing triggers in parallel
    await Promise.all([
      updateWarmupStats(
        {
          user_id: sender.user_id,
          mailbox_id: sender.id,
          mailbox_email: sender.email,
          provider: sender.esp_type,
        },
        {
          user_id: receiver.user_id,
          mailbox_id: receiver.id,
          mailbox_email: receiver.email,
          provider: receiver.esp_type,
        },
        new Date().toISOString(),
        result.messageId,
        content.id,
        replyTime,
        nextReplyExists ? reply_count + 1 : null
      ),
      deleteWarmupReplyTriggers(payload.id),
    ]);
    // reset disconnect stage if email sent successfully after a failure
    if(sender.disconnect_stage) {
      await resetMailboxDisconnectStage({
        user_id: sender.user_id,
        mailbox_id: sender.id,
      });
    }
  } else {
    // mark the mailbox as disocnnected or pause for a while based on the error
    console.error("Failed to send warmup reply email:", result);
    
    if (result.message.includes('be forwarded from') && sender) {
      return await handleMailboxForwardingErrors({
        userId: sender.user_id,
        mailboxId: sender.id,
        errorMessage: result.message,
      });
    }
    // find out disconnect stage
    const disconnectStage = (sender?.disconnect_stage || 0) + 1;
    // handle IMAP specific failures
    return await handleSenderFailureErrors({
      userId: sender.user_id,
      mailboxId: sender.id,
      disconnectStage,
      disconnectReason: result.message, 
    });
  }
}

module.exports = { processReply };