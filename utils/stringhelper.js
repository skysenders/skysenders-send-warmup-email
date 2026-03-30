/* eslint-disable no-undef */
exports.truncateString = (str, maxLength) => {
  return str && str.length > maxLength ? str.substring(0, maxLength) : str;
};

const USER_MASK = 0x5A9F33;
const MAILBOX_MASK = 0x8C12AA55;
const THREAD_MASK = 0xA55AA55AA5n;

// Secure Random Generator for Salt and Prefix
const getSecureValues = (count) => {
  const array = new Uint16Array(count);
  crypto.getRandomValues(array);
  return array;
};

exports.generateMessageId = (userId, mailboxId, threadId, email, flag) => {
  const [prefixVal, salt] = getSecureValues(2);

  // Plain timestamp
  const timestamp = Math.floor(Date.now() / 1000);

  const prefixHex = (prefixVal % 256).toString(16).padStart(2, '0');
  const saltHex = salt.toString(16).padStart(4, '0');
  const salt32 = (salt | (salt << 16)) >>> 0;

  const threadHex = ((BigInt(threadId) ^ THREAD_MASK ^ BigInt(salt)) & 0xFFFFFFFFFFn)
    .toString(16).padStart(10, '0');

  const userHex = ((Number(userId) ^ USER_MASK ^ salt) >>> 0)
    .toString(16).padStart(6, '0').slice(-6);

  const mailboxHex = ((Number(mailboxId) ^ MAILBOX_MASK ^ salt32) >>> 0)
    .toString(16).padStart(8, '0').slice(-8);

  const flagHex = ((flag.charCodeAt(0) ^ (salt & 0xFF)) & 0xFF)
    .toString(16).padStart(2, '0');

  // Final HEX string
  const encoded =
    prefixHex + saltHex + threadHex + userHex + mailboxHex + flagHex;

  const finalString = `${timestamp}.${encoded}`;

  return `<${finalString}@${email.split('@')[1]}>`;
};

exports.parseMessageId = (messageId) => {
  const match = messageId?.match(/<([^@]+)@/);
  if (!match) return null;

  try {
    const [timestampPart, hex] = match[1].split('.');
    if (!timestampPart || !hex) return null;

    const timestamp = new Date(Number(timestampPart) * 1000);

    const salt = parseInt(hex.substring(2, 6), 16);
    const salt32 = (salt | (salt << 16)) >>> 0;

    const threadHex = hex.substring(6, 16);
    const userHex = hex.substring(16, 22);
    const mailboxHex = hex.substring(22, 30);
    const flagHex = hex.substring(30, 32);

    return {
      timestamp,
      threadId: Number(BigInt('0x' + threadHex) ^ THREAD_MASK ^ BigInt(salt)),
      userId: (parseInt(userHex, 16) ^ USER_MASK ^ salt) >>> 0,
      mailboxId: (parseInt(mailboxHex, 16) ^ MAILBOX_MASK ^ salt32) >>> 0,
      flag: String.fromCharCode(parseInt(flagHex, 16) ^ (salt & 0xFF))
    };

  } catch (e) {
    return null;
  }
};
