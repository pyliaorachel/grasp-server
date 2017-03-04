'use strict';

const fetch = require('node-fetch');

const qs = require('qs');
const config = require('./config');

const url = 'https://language.googleapis.com/v1/documents:analyzeSentiment?';

function getSentiment(content, fields, type) {
  (fields === undefined) && (fields = 'documentSentiment,sentences');
  (type === undefined) && (type = 'PLAIN_TEXT');

  const apiUrl = url + qs.stringify({
    key: config.googleApiKey,
    fields,
  });
  return fetch(apiUrl, {
    method: 'POST',
    headers: {  
      "Content-type": "application/json; charset=UTF-8"  
    },  
    body: JSON.stringify({
      document: {
        content,
        type,
      }
    }),
  })
    .then(res => res.json());
}

module.exports = {
  getSentiment,
};