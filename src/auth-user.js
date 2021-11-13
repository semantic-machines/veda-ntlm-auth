const fs = require('fs');
const errorDelay = 10000;

let authAdmin;

/**
 * Authenticate admin
 * @param {Object} OPTIONS
 * @param {Object} http
 * @param {boolean} isSecure
 * @param {string} ca
 */
function getAuthAdmin (OPTIONS, http, isSecure, ca) {
  authAdmin = {};
  const args = [...arguments];
  const params = {
    method: 'GET',
    hostname: OPTIONS.veda.url,
    port: OPTIONS.veda.port,
    path: `/authenticate?login=${OPTIONS.veda.username}&password=${OPTIONS.veda.password}`,
    ...(isSecure && ca && {ca: ca}),
  };
  http.request(params, (response) => {
    if (response.statusCode !== 200) {
      const msg = `Error: failed to get Veda ticket for admin`;
      console.log(new Date().toISOString(), msg);
      setTimeout(getAuthAdmin, errorDelay, ...args);
      return;
    }
    let result = '';
    response.on('data', (chunk) => result += chunk);
    response.on('end', () => {
      try {
        authAdmin = parseAuthResult(result);
        console.log(new Date().toISOString(), `Admin authenticated successfully. Ticket will expire ${new Date(authAdmin.end_time).toISOString()}`);
        setTimeout(getAuthAdmin, (authAdmin.end_time - Date.now()) * 0.9, ...args);
      } catch (err) {
        const msg = `Error: Veda admin auth result parsing failed, ${err}`;
        console.log(new Date().toISOString(), msg);
        setTimeout(getAuthAdmin, errorDelay, ...args);
      }
    });
  }).on('error', (err) => {
    const msg = `Error: failed to get Veda ticket for admin, ${err}`;
    console.log(new Date().toISOString(), msg);
    setTimeout(getAuthAdmin, errorDelay, ...args);
  }).end();
}

/**
 * Parse auth result
 * @param {string} str
 * @return {Object}
 */
function parseAuthResult (str) {
  const json = JSON.parse(str);
  return {
    ticket: json.id,
    user_uri: json.user_uri,
    end_time: Math.floor((json.end_time - 621355968000000000) / 10000),
  };
}

module.exports = function authUser (OPTIONS) {
  const isSecure = OPTIONS.veda.port === 443;
  let http; let ca;
  if (isSecure) {
    http = require('https');
    ca = OPTIONS.veda.ca && fs.readFileSync(OPTIONS.veda.ca);
  } else {
    http = require('http');
  }
  if (!authAdmin) {
    getAuthAdmin(OPTIONS, http, isSecure, ca);
  }

  return (req, res) => {
    const realIP = req.get('X-Real-IP');
    const username = req.veda.username;
    const params = {
      method: 'GET',
      hostname: OPTIONS.veda.url,
      port: OPTIONS.veda.port,
      path: `/get_ticket_trusted?ticket=${authAdmin.ticket}&login=${username}${realIP ? '&ip=' + realIP : ''}`,
      ...(isSecure && ca && {ca: ca}),
    };
    http.request(params, (response) => {
      if (response.statusCode !== 200) {
        const msg = `Error: failed to get Veda ticket for user ${username}`;
        console.log(new Date().toISOString(), msg);
        res.status(response.statusCode).send({message: msg});
        return;
      }
      let result = '';
      response.on('data', (chunk) => result += chunk);
      response.on('end', () => {
        try {
          res.send(parseAuthResult(result));
          console.log(new Date().toISOString(), `User ${username} authenticated successfully in Veda, IP: ${realIP}`);
        } catch (err) {
          const msg = `Error: Veda auth result parsing failed, ${err}`;
          console.log(new Date().toISOString(), msg);
          res.status(500).send({message: msg});
        }
      });
    }).on('error', (err) => {
      const msg = `Error: failed to get Veda ticket for user ${username}, ${err}`;
      console.log(new Date().toISOString(), msg);
      res.status(500).send({message: msg});
    }).end();
  };
};
