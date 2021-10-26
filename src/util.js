/**
 * Translate auth result
 * @param {string} str
 * @return {Object}
 */
module.exports.parseAuthResult = function (str) {
  try {
    const json = JSON.parse(str);
    return {
      ticket: json.id,
      user_uri: json.user_uri,
      end_time: Math.floor((json.end_time - 621355968000000000) / 10000),
    };
  } catch (err) {
    console.error(new Date().toISOString(), 'Veda response parsing failed', err);
  }
};
