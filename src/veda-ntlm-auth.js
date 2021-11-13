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
    function (req, res, next) {
      console.log(new Date().toISOString(), `NTLM form username: ${req.body.username}`);
      next();
    },
    passport.initialize(),
    function (req, res, next) {
      passport.authenticate('ldapauth', {session: false}, function (err, user, info) {
        if (err) return next(err);
        if (!user) {
          console.log(new Date().toISOString(), `Error: failed to authenticate user in LDAP, ${info.message}`);
          return res.status(401).send(info);
        }
        const username = user.sAMAccountName;
        console.log(new Date().toISOString(), `User ${username} authenticated successfully in LDAP`);
        req.veda = {username: username};
        next();
      })(req, res, next);
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
        req.veda = {username: username};
        console.log(new Date().toISOString(), 'NTLM auto username:', username);
        next();
      } else {
        req.status(403).send();
      }
    },
    authUser(OPTIONS),
  ];
};
