'use strict';

const fetch = require('node-fetch');

const qs = require('qs');
const config = require('./config');

const url = 'https://translation.googleapis.com/language/translate/v2?';

function getTranslation(q, target) {
  (target === undefined) && (target = 'en');

  const apiUrl = url + qs.stringify({
    key: config.googleApiKey,
    q,
    target,
  });
  return fetch(apiUrl, {
    method: 'GET',
  });
}

module.exports = {
  getTranslation,
};