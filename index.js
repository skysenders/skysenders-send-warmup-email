const { processWarmup } = require("./handlers/warmup.handler");
const { processReply } = require("./handlers/warmup.reply.handler");

exports.handler = async (event) => {
  const CONCURRENCY = 5;
  const failures = [];

  const records = [...event.Records];

  const worker = async () => {
    while (records.length) {
      const record = records.shift();
      if (!record) break;
      
      try {
        const payload = JSON.parse(record.body);

        if (payload.type === "WARMUP_REPLY") {
          await processReply(payload);
        } else {
          await processWarmup(payload);
        }

        console.log(`Processed: ${payload.type}`);
      } catch (err) {
        console.error("Error processing record:", {
          messageId: record.messageId,
          error: err.message,
        });

        failures.push({
          itemIdentifier: record.messageId,
        });
      }
    }
  };

  // Create 5 parallel workers
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return {
    batchItemFailures: failures,
  };
};