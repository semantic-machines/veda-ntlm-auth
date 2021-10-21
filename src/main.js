const fs = require('fs');
const OPTIONS = JSON.parse(fs.readFileSync('./options.json'));

const express = require('express');
const passport = require('passport');

const WindowsStrategy = require('passport-windowsauth');
const LdapStrategy = require('passport-ldapauth');
const bodyParser = require('body-parser');

const {getVedaTicket} = require('./veda_auth.js');
const app = express();

passport.use(new WindowsStrategy({
  ldap: OPTIONS.ldap,
}, function (user, done) {
  console.log(new Date().toISOString(), 'NTLM auto username:', user);
  done(err, user);
}));

passport.use(new LdapStrategy({
  server: OPTIONS.ldap,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(passport.initialize());

app.get('/ntlm',
  passport.authenticate('WindowsAuthentication'),
  function (req, res) {
    const username = req.user.sAMAccountName;
    console.log(new Date().toISOString(), 'NTLM auto username:', username);
    getVedaTicket(username)(req, res);
  },
);

app.post('/ntlm',
  passport.authenticate('ldapauth', {session: false}),
  function (req, res) {
    const username = req.user.sAMAccountName;
    console.log(new Date().toISOString(), 'NTLM form username:', username);
    getVedaTicket(username)(req, res);
  },
);

app.listen(OPTIONS.listen);

console.log(new Date().toISOString(), 'Veda NTLM authentication service started');
