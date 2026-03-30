const Handlebars = require("handlebars");

exports.buildWarmupTemplateData = (sender, receiver, identifiers) => {
  return {
    sender_name: `${sender.first_name} ${sender.last_name || ""}`,
    receiver_name: `${receiver.first_name} ${receiver.last_name || ""}`,
    sender_identifier: identifiers.from_warmup_identifier,
    receiver_identifier: identifiers.to_warmup_identifier,
  };
};

exports.compileHandlebarsTemplate = (content, data) => {
  return Handlebars.compile(content)(data);
}