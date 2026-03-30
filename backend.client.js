const axios = require("axios");
const { BE_URL, AUTH_TOKEN } = require("./constants");

// Create reusable axios instance
const api = axios.create({
  baseURL: BE_URL,
  timeout: 10000,
  params: {
    "auth-token": AUTH_TOKEN,
  },
});

/**
 * Generic GET wrapper
 */
async function get(url, params = {}) {
  try {
    const res = await api.get(url, { params });
    return res.data;
  } catch (error) {
    logError("GET", url, params, error);
    return null;
  }
}

/**
 * Generic POST wrapper
 */
async function post(url, data = {}) {
  try {
    const res = await api.post(url, data);
    return res.data;
  } catch (error) {
    logError("POST", url, data, error);
    return null;
  }
}

/**
 * Generic DELETE wrapper
 */
async function del(url, params = {}) {
  try {
    const res = await api.delete(url, { params });
    return res.data;
  } catch (error) {
    logError("DELETE", url, params, error);
    return null;
  }
}

/**
 * Centralized error logger
 */
function logError(method, url, payload, error) {
  console.error(
    `[BackendClient] ${method} ${url} failed`,
    {
      payload,
      message: error.message,
      response: error.response?.data || null,
      status: error.response?.status || null,
    }
  );
}

/** ---------------------------------------------------
 *               API METHODS
 * --------------------------------------------------- */

/**
 * Fetch mailbox details (sender/receiver)
 */
async function fetchSenderDetails(userId, mailboxId) {
  return get("/api/internal/fetch-mailbox-details-by-id", {
    user_id: userId,
    mailbox_id: mailboxId,
  });
}

/**
 * Fetch random receiver mailbox
 */
async function fetchRandomReceiver(userId, mailboxId) {
  return get("/api/internal/fetch-random-warmup-mailbox", {
    user_id: userId,
    mailbox_id: mailboxId,
  });
}

/**
 * Fetch random warmup message
 */
async function fetchWarmupMessage(mailboxId) {
  return get(`/api/internal/fetch-random-warmup-message/${mailboxId}`);
}

/**
 * Fetch warmup message by ID
 */
async function fetchWarmupMessageById(messageRefId) {
  return get("/api/internal/fetch-warmup-message-by-id", {
    id: messageRefId,
  });
}

/**
 * Fetch warmup identifiers
 */
async function fetchWarmupIdentifier(
  fromUserId,
  fromMailboxId,
  toUserId,
  toMailboxId
) {
  return get("/api/internal/fetch-warmup-identifiers", {
    from_user_id: fromUserId,
    from_mailbox_id: fromMailboxId,
    to_user_id: toUserId,
    to_mailbox_id: toMailboxId,
  });
}

/**
 * Delete warmup reply trigger
 */
async function deleteWarmupReplyTriggers(warmupReplyTriggerId) {
  return del("/api/internal/delete-warmup-reply-triggers", {
    id: warmupReplyTriggerId,
  });
}

/**
 * Update warmup stats
 */
async function updateWarmupStats(
  fromAccount,
  toAccount,
  sentTime,
  messageId,
  messageRefId,
  replyTime,
  replyCount
) {
  return post("/api/internal/update-warmup-sent-message", {
    from_account: fromAccount,
    to_account: toAccount,
    sent_time: sentTime,
    message_id: messageId,
    message_ref_id: messageRefId,
    reply_time: replyTime,
    reply_count: replyCount,
  });
}

/** ---------------------------------------------------
 *               EXPORTS
 * --------------------------------------------------- */

module.exports = {
  fetchSenderDetails,
  fetchRandomReceiver,
  fetchWarmupMessage,
  fetchWarmupMessageById,
  fetchWarmupIdentifier,
  deleteWarmupReplyTriggers,
  updateWarmupStats,
};