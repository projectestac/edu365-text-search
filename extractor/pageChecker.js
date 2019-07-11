/*!
 *  File    : pageChecker.js
 *  Created : 19/06/2019
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  Checks the content of a specific web page, using puppeteer
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

const SortedArray = require('sorted-array');
const puppeteer = require('puppeteer');

// Build the stop-words list
const STOP_WORDS = new SortedArray(Object.values(require('./stopwords.json')).reduce((acc, val) => acc.concat(val), []));

/**
 * Checks a single URL, obtaining its full text and title.
 * @param {puppeteer.Page} browserPage - The puppeteer tab to be used as container
 * @param {object} page - Object with miscellaneous data about the page to be examined
 * @param {string} BASE_URL - URL to be prepended on all relative paths
 * @param {winston.Logger} logger - A winston logger
 */
async function processPage(browserPage, page, BASE_URL, logger) {

  const url = `${BASE_URL}${page.path}`;

  logger.info( 'Processing %s', url);

  // Enable or disable JavaScript
  logger.verbose( `Javascript will be ${page.js ? 'enabled' : 'disabled'} for ${url}`);
  await browserPage.setJavaScriptEnabled(page.js || false);

  // Got to the specified path
  logger.verbose( 'Instructing puppeteer to navigate to %s', url);
  await browserPage.goto(url);

  // Read body text
  logger.verbose( 'Reading the body text of %s', url);
  const body = await browserPage.$('body');
  const bodyText = await browserPage.evaluate(body => body.innerText, body);
  await body.dispose();

  // Read title
  if (!page.title) {
    page.title = await browserPage.title();
    logger.verbose( 'The title of %s will be: "%s"', url, page.title);
  }

  // Update target
  page._text = getWords(`${page.title} ${bodyText} ${page.descriptors || ''}`);

  return page;
}

/**
 * Obtains a single string with all words contained on the given text.
 * Words are lowercased and ordered. Repetitions, common words and special characters are omitted.
 * @param {string} txt 
 * @return {string}
 */
function getWords(txt) {
  return txt
    .split(/[\s.…|;,_<>"“”«»'´’‘~+\-–—―=%¿?¡!:/\\()\[\]{}$£*0-9\u2022]/)
    .map(word => {
      word = word.trim().toLowerCase();
      return (word.length > 1 && STOP_WORDS.search(word) === -1) ? word : null;
    }, [])
    .sort()
    .filter((v, n, arr) => v !== null && n > 0 && v !== arr[n - 1] ? true : false)
    .join(' ');
}

/**
 * Process a set of pages, returning its full text if updated
 * @param {object[]} pages - Array of complex objects with information about the pages to be processed
 * @param {string} BASE_URL - URL to prepend to all relative paths
 * @param {winston.Logger} logger - The logger to be used during the process
 */
async function checkPages(pages, BASE_URL, logger) {
  logger.info( 'Puppeteer: starting headless browser');
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  logger.info( 'Puppeteer: building a tab on the browser');
  const browserPage = await browser.newPage();

  // Sequential processing of targets
  // TODO: Process groups of targets in parallel  
  for (let n in pages) {
    const page = pages[n];
    if (page._updated)
      await processPage(browserPage, page, BASE_URL, logger);
  }
  logger.info( 'Puppeteer: finishing browser');
  await browser.close();
  return pages;
}

module.exports = {
  checkPages,
  processPage,
  getWords,
};
