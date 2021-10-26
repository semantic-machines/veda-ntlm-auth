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

let authAdmin = {};

(function getAuthAdmin () {
  const params = {
    hostname: OPTIONS.veda.url,
    port: OPTIONS.veda.port,
    path: `/authenticate?login=${OPTIONS.veda.username}&password=${OPTIONS.veda.password}`,
    method: 'GET',
    ...(isSecure && ca && {ca: ca}),
  };
  http.request(params, (response) => {
    let body = '';
    response.on('data', (chunk) => body += chunk);
    response.on('end', () => {
      authAdmin = parseAuthResult(body);
      console.log(new Date().toISOString(), `Admin authenticated successfully. Ticket will expire ${new Date(authAdmin.end_time).toISOString()}`);
      setTimeout(getAuthAdmin, (authAdmin.end_time - Date.now()) * 0.9);
    });
  })
    .on('error', (err) => console.error(new Date().toISOString(), `Error: failed to get Veda ticket for admin, ${err}`))
    .end();
})();

module.exports = function () {
  return authAdmin;
};
