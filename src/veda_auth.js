const fs = require('fs');
const OPTIONS = JSON.parse(fs.readFileSync('./options.json'));

const rootCA = fs.readFileSync(OPTIONS.veda.cert);
const http = OPTIONS.veda.port === 443 ? require('https') : require('http');

/**
 * Translate auth result
 * @param {string} str
 * @return {Object}
 */
function translate (str) {
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
}

let auth = {};

(function getAdminTicket () {
  const params = {
    hostname: OPTIONS.veda.url,
    port: OPTIONS.veda.port,
    path: `/authenticate?login=${OPTIONS.veda.username}&password=${OPTIONS.veda.password}`,
    method: 'GET',
    ca: rootCA,
  };
  http.request(params, (response) => {
    let body = '';
    response.on('data', (chunk) => body += chunk);
    response.on('end', () => {
      auth = translate(body);
      console.log(new Date().toISOString(), `Admin authenticated successfully. Ticket will expire ${new Date(auth.end_time).toISOString()}`);
      setTimeout(getAdminTicket, (auth.end_time - Date.now()) * 0.9);
    });
  })
    .on('error', (err) => console.error(new Date().toISOString(), `Error: failed to get Veda ticket for admin, ${err}`))
    .end();
})();

/**
 * Get ticket for authenticated user
 * @param {string} username
 * @return {Object}
 */
module.exports.getVedaTicket = function (username) {
  return (req, res) => {
    const realIP = req.get('X-Real-IP');
    const params = {
      hostname: OPTIONS.veda.url,
      port: OPTIONS.veda.port,
      path: `/get_ticket_trusted?ticket=${auth.ticket}&login=${username}${realIP ? '&ip=' + realIP : ''}`,
      method: 'GET',
      ca: rootCA,
    };
    http.request(params, (response) => {
      let body = '';
      response.on('data', (chunk) => body += chunk);
      response.on('end', () => {
        res.json(translate(body));
        console.log(new Date().toISOString(), `User ${username} authenticated successfully, IP: ${realIP}`);
      });
    }).on('error', (err) => {
      console.error(new Date().toISOString(), `Error: failed to get Veda ticket for user ${username}, ${err}`);
      res.sendStatus(500);
    }).end();
  };
};
