const fs = require('fs');
const OPTIONS = JSON.parse(fs.readFileSync('./options.json'));
const {parseAuthResult} = require('./util.js');

const isSecure = OPTIONS.veda.port === 443;
let http; let ca;
if (isSecure) {
  http = require('https');
  ca = OPTIONS.veda.ca && fs.readFileSync(OPTIONS.veda.ca);
} else {
  http = require('http');
}

const authAdmin = require('./auth_admin.js');

/**
 * Get ticket for authenticated user
 * @param {string} username
 * @return {Object}
 */
module.exports = function authUser (username) {
  return (req, res) => {
    const realIP = req.get('X-Real-IP');
    const params = {
      hostname: OPTIONS.veda.url,
      port: OPTIONS.veda.port,
      path: `/get_ticket_trusted?ticket=${authAdmin().ticket}&login=${username}${realIP ? '&ip=' + realIP : ''}`,
      method: 'GET',
      ...(isSecure && ca && {ca: ca}),
    };
    http.request(params, (response) => {
      let result = '';
      response.on('data', (chunk) => result += chunk);
      response.on('end', () => {
        res.json(parseAuthResult(result));
        console.log(new Date().toISOString(), `User ${username} authenticated successfully, IP: ${realIP}`);
      });
    }).on('error', (err) => {
      console.error(new Date().toISOString(), `Error: failed to get Veda ticket for user ${username}, ${err}`);
      res.sendStatus(500);
    }).end();
  };
};
