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
const http = require('http');
const url = require('url');


// Local port for OAuth2 callback(should be mapped to a public URL with ngrok or similar)
const OAUTH2_CALLBACK_PORT = process.env.OAUTH2_CALLBACK_PORT || 3000;

/**
 * Create an OAuth2 client with the given credentials
 * 
 * @param {object} credentials - The authorization client credentials.
 * @param {string} tokenPath - Path of the file where the auth token should be found (or otherwise created)
 * @param {string[]} scope - Array of API scopes for wich this credentials are requested
 * @param {object} logger - The logger object to be used to log messages
 * 
 * @returns {google.auth.OAuth2} - The resulting oAuth2Client
 */
async function authorize(credentials, tokenPath, scope, logger) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  logger.verbose('Building OAuth2 client');
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  let token = null;
  if (fs.existsSync(tokenPath)) {
    logger.verbose('Reusing the OAuth2 token found in %s', tokenPath);
    token = JSON.parse(await readFile(tokenPath));
  } else {
    logger.verbose('No previous OAuth2 token found. Creating a new one.');
    token = await getNewToken(oAuth2Client, tokenPath, scope, logger);
  }

  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

/**
 * Get a new token after prompting for user authorization, and store it in a JSON file
 * 
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for
 * @param {string} tokenPath - Path of the file where the auth token should be found (or otherwise created)
 * @param {string[]} scope - Array of API scopes for wich this credentials are requested
 * @param {object} logger - The logger object to be used to log messages
 * 
 * @returns {object} token - The resulting token
 */
async function getNewToken(oAuth2Client, tokenPath, scope, logger) {

  logger.verbose('Generating the authorization URL');
  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scope,
  });

  logger.verbose('Waiting for Google\'s code');

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth2callback') > -1) {
          // Acquire the code from the querystring
          const qs = new url.URL(req.url, `http://localhost:${OAUTH2_CALLBACK_PORT}`).searchParams;
          const code = qs.get('code');
          console.log(`Code is ${code}`);
          res.end('Authentication successful!');

          const token = await oAuth2GetToken(oAuth2Client, code);
          await writeFile(tokenPath, JSON.stringify(token));
          logger.verbose('New token stored in %s', tokenPath);
          server.close();
          resolve(token);
        }
      } catch (e) {
        logger.verbose('Error adquiring new token: %s', e);
        server.close();
        reject(e);
      }
    })
      .listen(OAUTH2_CALLBACK_PORT, () => {
        // Tell the user to open the URL in the browser:
        console.log('Authorize this app by visiting this url:', authorizeUrl);
      });
  });
}

/**
 * Read one line of text from stdin 
 * @param {string} prompt - The prompt phrase
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
 * Get an authorization token from the Google API services
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
 * 
 * @param {object} credentialsPath - Path of the file with the authorization client credentials
 * @param {string} tokenPath - Path of the file where the auth token should be found (or otherwise created)
 * @param {string[]} scope - Array of API scopes for wich this credentials are requested
 * @param {object} logger - The logger object to be used to log messages
 * 
 * @returns {google.auth.OAuth2} - The resulting oAuth2Client
 */
async function getOauth2Client(credentialsPath, tokenPath, scope, logger) {
  logger.verbose('Reading %s', credentialsPath);
  const credentials = JSON.parse(await readFile(credentialsPath));
  logger.info('Getting the OAuth2 client');
  const oAuth2Client = await authorize(credentials, tokenPath, scope, logger);
  return oAuth2Client;
}

module.exports = {
  getOauth2Client,
  readOneLine,
};