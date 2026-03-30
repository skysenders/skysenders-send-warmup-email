exports.getRandomReplyTime = () => {
  return new Date(
    Date.now() + (3 + Math.random() * 5) * 60 * 60 * 1000
  ).toISOString();
}