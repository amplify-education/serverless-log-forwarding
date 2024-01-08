// eslint-disable-next-line @typescript-eslint/no-var-requires
const randomstring = require("randomstring");

export const PLUGIN_IDENTIFIER = "slf";
export const RANDOM_STRING = randomstring.generate({
  capitalization: "lowercase",
  charset: "alphanumeric",
  length: 5
});
export const TEMP_DIR = `~/tmp/serveless-log-forwarding-integration-tests/${RANDOM_STRING}`;

process.env.PLUGIN_IDENTIFIER = PLUGIN_IDENTIFIER;
process.env.RANDOM_STRING = RANDOM_STRING;

module.exports = {
  PLUGIN_IDENTIFIER,
  RANDOM_STRING,
  TEMP_DIR
};
