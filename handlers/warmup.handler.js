const {
  fetchSenderDetails,
  fetchRandomReceiver,
  fetchWarmupMessage,
  fetchWarmupIdentifier,
  updateWarmupStats,
} = require("../backend.client");

const { sendMail } = require("../send_email/index");
const { buildWarmupTemplateData, compileHandlebarsTemplate } = require("../utils/handlebars.utils");
const { shouldReply } = require("../utils/reply.utils");
const { getRandomReplyTime } = require("../utils/time.utils");
const { generateMessageId } = require("../utils/stringhelper");

exports.processWarmup = async (payload) => {
  // extract necessary fields from payload
  const { user_id, mailbox_id, daily_target, sent_today, reply_rate } = payload;
  console.log("Processing warmup for user_id:", user_id, "mailbox_id:", mailbox_id);

  // fetch sender, receiver, and warmup message content in parallel
  const [sender, receiver, content] = await Promise.all([
    fetchSenderDetails(user_id, mailbox_id),
    fetchRandomReceiver(user_id, mailbox_id),
    fetchWarmupMessage(mailbox_id),
  ]);

  // if any of the required data is missing, throw an error
  if (!sender || !receiver || !content) throw new Error("Missing data");

  // fetch the warmup identifier for both sender and receiver
  const identifiers = await fetchWarmupIdentifier(
    sender.user_id,
    sender.id,
    receiver.user_id,
    receiver.id
  );

  let subject = content.subject;
  let body = content.email_body;

  // build the email content using Handlebars templates
  const templateData = buildWarmupTemplateData(sender, receiver, identifiers);
  subject = compileHandlebarsTemplate(subject, templateData);
  body = compileHandlebarsTemplate(body, templateData);

  // generate a unique message ID for the email
  const messageId = generateMessageId(sender.user_id, sender.id, receiver.id, sender.email, 'W');

  console.log("Sending warmup email from:", sender.email, "to:", receiver.email, "with messageId:", messageId);
  // send the email using the sender's SMTP credentials
  const result = await sendMail(
    {
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
    },
  );

  // check if a reply is needed based on the daily target, sent today count, and reply rate
  const needReply = shouldReply(daily_target, sent_today + 1, reply_rate);
  const replyTime = needReply ? getRandomReplyTime() : null;

  console.log("Updating the warmup message details:", result.messageId, "Need reply:", needReply, "Reply time (if needed):", replyTime);

  // update the warmup stats in the backend with the result of the email sending and whether a reply is needed
  await updateWarmupStats(
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
    needReply ? 1 : 0
  );
}