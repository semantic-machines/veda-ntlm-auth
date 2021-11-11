const fs = require('fs');
const OPTIONS = JSON.parse(fs.readFileSync('./options.json'));

const express = require('express');
const app = express();
const {formAuth, autoAuth} = require('./veda-ntlm-auth.js');

app.post('/ntlm', formAuth(OPTIONS));
app.get('/ntlm', autoAuth(OPTIONS));

app.listen(
  OPTIONS.port,
  OPTIONS.host,
  () => console.log(new Date().toISOString(), `Veda NTLM authentication service started on ${OPTIONS.host}:${OPTIONS.port}`),
);
