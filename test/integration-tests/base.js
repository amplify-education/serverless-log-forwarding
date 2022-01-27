randomstring = require("randomstring");

// this is set in the each sls configs for the cleanup purpose in case of tests failure
const PLUGIN_IDENTIFIER = "slf";
const RANDOM_STRING = "hello";
/** TODO: uncomment
const RANDOM_STRING = randomstring.generate({
    capitalization: "lowercase",
    charset: "alphanumeric",
    length: 5,
});
**/
const TEMP_DIR = `~/tmp/serveless-log-forwarding-integration-tests/${RANDOM_STRING}`;

process.env.PLUGIN_IDENTIFIER = PLUGIN_IDENTIFIER
process.env.RANDOM_STRING = RANDOM_STRING

module.exports = {
    PLUGIN_IDENTIFIER,
    RANDOM_STRING,
    TEMP_DIR
};
