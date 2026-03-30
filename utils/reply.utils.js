exports.shouldReply = (daily_target, sent_today, reply_rate) => {
  if (!daily_target || !reply_rate) return false;

  const totalReplies = Math.round(daily_target * (reply_rate / 100));
  if (totalReplies === 0) return false;

  const interval = daily_target / totalReplies;
  const replyIndex = Math.round(sent_today / interval);

  return Math.abs(sent_today - replyIndex * interval) < 0.5;
};