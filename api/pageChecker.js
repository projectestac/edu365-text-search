
const SortedArray = require('sorted-array');
const puppeteer = require('puppeteer');

// Build the stop-words list
const STOP_WORDS = new SortedArray(Object.values(require('./stopwords.json')).reduce((acc, val) => acc.concat(val), []));


async function processPage(browserPage, page, BASE_URL) {

  const url = `${BASE_URL}${page.path}`;

  console.log(`S'està processant: ${url}`);

  // Enable or disable JavaScript
  await browserPage.setJavaScriptEnabled(page.js || false);

  // Got to the specified path
  await browserPage.goto(url);

  // Read body text
  const body = await browserPage.$('body');
  const bodyText = await browserPage.evaluate(body => body.innerText, body);
  await body.dispose();

  // Read title
  if (!page.title)
    page.title = await browserPage.title();

  // Update target
  page._text = getWords(`${page.title} ${bodyText} ${page.descriptors || ''}`);

  return page;
}

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

async function checkPages(pages, BASE_URL) {
  const browser = await puppeteer.launch();
  const browserPage = await browser.newPage();

  // Sequential processing of targets
  // TODO: Process groups of targets in parallel  
  for (let n in pages) {
    const page = pages[n];
    if (page._updated)
      await processPage(browserPage, page, BASE_URL);
  }
  await browser.close();
  return pages;
}

module.exports = {
  checkPages,
  processPage,
  getWords,
};

