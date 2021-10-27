const passport = require('passport');
const LdapStrategy = require('passport-ldapauth');
const bodyParser = require('body-parser');
const ntlm = require('express-ntlm');
const authUser = require('./auth-user.js');

module.exports.formAuth = function (OPTIONS) {
  const isSecure = OPTIONS.ldap.url.indexOf('ldaps') === 0;
  passport.use(new LdapStrategy({
    server: {
      ...OPTIONS.ldap,
      ...(isSecure && OPTIONS.ldap.ca && {
        tlsOptions: {
          ca: [fs.readFileSync(OPTIONS.ldap.ca)],
        },
      }),
    },
  }));

  return [
    bodyParser.urlencoded({extended: false}),
    passport.initialize(),
    passport.authenticate('ldapauth', {session: false}),
    function (req, res, next) {
      const username = req.user.sAMAccountName;
      req.veda = req.veda || {username: username};
      console.log(new Date().toISOString(), 'NTLM form username:', username);
      next();
    },
    authUser(OPTIONS),
  ];
};

module.exports.autoAuth = function (OPTIONS) {
  const isSecure = OPTIONS.ldap.url.indexOf('ldaps') === 0;

  return [
    ntlm({
      domain: OPTIONS.ldap.domain,
      domaincontroller: OPTIONS.ldap.url,
      ...(isSecure && OPTIONS.ldap.ca && {
        tlsOptions: {
          ca: fs.readFileSync(OPTIONS.ldap.ca),
        },
      }),
    }),
    function (req, res, next) {
      if (!req.headers.authorization) {
        res.set( 'WWW-Authenticate', 'Negotiate' );
        res.status(401).send();
      } else if (req.ntlm.Authenticated === true) {
        const username = req.ntlm.UserName;
        req.veda = req.veda || {username: username};
        console.log(new Date().toISOString(), 'NTLM auto username:', username);
        next();
      } else {
        req.status(403).send();
      }
    },
    authUser(OPTIONS),
  ];
};
