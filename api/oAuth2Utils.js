/*!
 *  File    : oAuth2Utils.js
 *  Created : 15/06/2019
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  Asynchronous utilities to obtain the OAuth2 tokens needed for Google APIs
 *
 *  @license EUPL-1.2
 *  @licstart
 *  (c) 2019 Educational Telematic Network of Catalonia (XTEC)
 *
 *  Licensed under the EUPL, Version 1.2 or -as soon they will be approved by
 *  the European Commission- subsequent versions of the EUPL (the "Licence");
 *  You may not use this work except in compliance with the Licence.
 *
 *  You may obtain a copy of the Licence at:
 *  https://joinup.ec.europa.eu/software/page/eupl
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  Licence for the specific language governing permissions and limitations
 *  under the Licence.
 *  @licend
 */

const { promisify } = require('util');
const fs = require('fs');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readline = require('readline');
const { google } = require('googleapis');

/**
 * Create an OAuth2 client with the given credentials
 * @param {object} credentials - The authorization client credentials.
 * @param {string} tokenPath - Path of the file where the auth token should be found (or otherwise created)
 * @returns {google.auth.OAuth2} - The resulting oAuth2Client
 */
async function authorize(credentials, tokenPath, scope) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = fs.existsSync(tokenPath) ?
    JSON.parse(await readFile(tokenPath)) :
    await getNewToken(oAuth2Client, tokenPath, scope);

  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

/**
 * Get and store a new token after prompting for user authorization
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {string} tokenPath - Path of the file where the auth token should be found (or otherwise created)
 * @returns {object} token - The resulting token
 */
async function getNewToken(oAuth2Client, tokenPath, scope) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scope,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const code = await readOneLine('Enter the code from that page here: ');
  const token = await oAuth2GetToken(oAuth2Client, code);
  oAuth2Client.setCredentials(token);
  await writeFile(tokenPath, JSON.stringify(token));
  console.log('Token stored to', tokenPath);
  return token;
}

/**
 * Reads one line from stdin 
 * @param {string} prompt - The prompt text
 */
async function readOneLine(prompt) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, response => {
      rl.close();
      if (!response)
        reject('No answer to a question posed!');
      else
        resolve(response);
    });
  });
}

/**
 * Gets an authorization token for Google API services
 * @param {google.auth.OAuth2} oAuth2Client - The oAuth2Client object
 * @param {string} code - The code obtained from a given auth URL
 * @returns {Object} - The auth token
 */
async function oAuth2GetToken(oAuth2Client, code) {
  return new Promise(function (resolve, reject) {
    oAuth2Client.getToken(code, (err, token) => {
      if (err)
        reject(err);
      resolve(token);
    });
  });
}

/**
 * Get or create an OAuth2 client with the given credentials and token
 * @param {object} credentialsPath - Path of the file with the authorization client credentials.
 * @param {string} tokenPath - Path of the file where the auth token should be found (or otherwise created)
 * @param {string[]} scope - Array of API scopes for wich this credentials are requested
 * @returns {google.auth.OAuth2} - The resulting oAuth2Client
 */
async function getOauth2Client(credentialsPath, tokenPath, scope) {
  const credentials = JSON.parse(await readFile(credentialsPath));
  const oAuth2Client = await authorize(credentials, tokenPath, scope);
  return oAuth2Client;
}

module.exports = {
  getOauth2Client,
  readOneLine,
};
