const { processWarmup } = require("./handlers/warmup.handler");
const { processReply } = require("./handlers/warmup.reply.handler");

exports.handler = async (event) => {
  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.body);

      if (payload.type === "WARMUP_REPLY") {
        await processReply(payload);
      } else {
        await processWarmup(payload);
      }

      console.log(`Processed: ${payload.type}`);
    } catch (err) {
      console.error("Error processing record:", err.message);
    }
  }

  return { status: "Batch Processed" };
};