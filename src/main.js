const fs = require('fs');
const OPTIONS = JSON.parse(fs.readFileSync('./options.json'));
const isSecure = OPTIONS.ldap.url.indexOf('ldaps') === 0;

const express = require('express');
const passport = require('passport');
const LdapStrategy = require('passport-ldapauth');
const bodyParser = require('body-parser');
const ntlm = require('express-ntlm');

const authUser = require('./auth_user.js');
const app = express();

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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(passport.initialize());
app.post('/ntlm',
  passport.authenticate('ldapauth', {session: false}),
  function (req, res) {
    const username = req.user.sAMAccountName;
    console.log(new Date().toISOString(), 'NTLM form username:', username);
    authUser(username)(req, res);
  },
);

app.get('/ntlm', ntlm({
  domain: OPTIONS.ldap.domain,
  domaincontroller: OPTIONS.ldap.url,
  ...(isSecure && OPTIONS.ldap.ca && {
    tlsOptions: {
      ca: fs.readFileSync(OPTIONS.ldap.ca),
    },
  }),
}), function (req, res) {
  if (!req.headers.authorization) {
    res.set( 'WWW-Authenticate', 'Negotiate' );
    res.status(401).send();
  } else if (req.ntlm.Authenticated === true) {
    const username = req.ntlm.UserName;
    console.log(new Date().toISOString(), 'NTLM auto username:', username);
    authUser(username)(req, res);
  } else {
    req.status(403).send();
  }
});

app.listen(OPTIONS.listen);

console.log(new Date().toISOString(), 'Veda NTLM authentication service started');
