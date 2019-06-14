#!/usr/bin/env node

// Usage:
//   ./index.js [--in pages.csv] [--out allwords.json] [--stop stopwords.json]

require('dotenv').config();
const argv = require('minimist')(process.argv.slice(2));
const { promisify } = require('util');
const fs = require('fs');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const chalk = require('chalk');
const SortedArray = require('sorted-array');
const csv = require('async-csv');
const puppeteer = require('puppeteer');

const CSV_FILE = argv['in'] || 'pages.csv';
const CSV_OPTIONS = {
  delimiter: ',',
  columns: true,
};

const BASE_URL = process.env.BASE_URL || 'http://edu365.cat';

const OUTPUT_FILE = argv['out'] || 'allwords.json';

const STOP_FILE = argv['stop'] || './stopwords.json'

// Build the stop-words list
const STOP_WORDS = new SortedArray(Object.values(require(STOP_FILE)).reduce((acc, val) => acc.concat(val), []));

// Labels for console out
const INFO = chalk.bold.green('INFO: ');
const ERROR = chalk.bold.red('ERROR: ');
const WARNING = chalk.bold.yellow('WARNING: ');

/**
 * Read the main CSV file
 * @param {string} file - The name of the file to read
 * @returns {object[]} - The resulting array of `page` objects
 */
async function readCSV(file) {

  // Read and parse the CSV file
  const csvText = await readFile(`${__dirname}/${file}`, { encoding: 'utf8' });
  const data = await csv.parse(csvText, CSV_OPTIONS);

  // Process data
  return data.map((reg, n) => {
    reg.enabled = (reg.enabled === 'TRUE');
    reg.js = (reg.js === 'TRUE');
    if (reg.enabled && !reg.path) {
      console.log(WARNING, `Manca el camp "path" a la línia ${n} del fitxer ${CSV_FILE}`);
      reg.enabled = false;
    }
    return reg;
  });
}

/**
 * Reads the page text of a specific URL composed by `BASE_URL` and a target path
 * @param {Puppeteer.Page} page 
 * @param {object} target - Composite object containing at least a `path` field.
 * @returns {object} - Returns `target` with extended attributes
 */
async function processTarget(page, target) {

  console.log(INFO, `S'està processant ${chalk.bold(target.path)}`);

  // Enable or disable JavaScript
  await page.setJavaScriptEnabled(target.js || false);

  // Got to the specified path
  const response = await page.goto(`${BASE_URL}${target.path}`);
  // read etag or 'last-modified'
  target.etag = (response._headers.etag || new Date(response._headers['last-modified'] || Date.now()).toISOString()).replace(/\"/g, '');

  // Read body text
  const body = await page.$('body');
  const bodyText = await page.evaluate(body => body.innerText, body);
  await body.dispose();

  // Read title
  if (!target.title)
    target.title = await page.title();

  // Update target
  target.words = getWords(`${target.title} ${bodyText} ${target.descriptors || ''}`);

  return target;
}

function getWords(txt) {
  return txt
    .split(/[\s.…|;,_<>"“”«»'´’‘~+\-–—―=%¿?¡!:/\\()\[\]{}$£*0-9\u2022]/)
    .map(word => {
      word = word.trim().toLowerCase()
      return (word.length > 1 && STOP_WORDS.search(word) === -1) ? word : null
    }, [])
    .sort()
    .filter((v, n, arr) => v !== null && n > 0 && v !== arr[n - 1] ? true : false)
    .join(' ');
}


// Main process
async function main() {
  if (!CSV_FILE) {
    console.log(ERROR, 'Cal indicar el fitxer CSV a processar');
    return 1;
  }

  try {
    const targets = await readCSV(CSV_FILE);
    console.log(INFO, `Es processaran ${targets.length} registres`);

    console.log(INFO, 'Preparant el navegador cec');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const result = [];

    // Sequential processing of targets
    // TODO: Process groups of targets in parallel
    for (let n in targets) {
      const target = targets[n];
      if (target.enabled)
        result.push(await processTarget(page, target));
    }

    await browser.close();

    console.log(INFO, `Escrivint el resultat final a ${OUTPUT_FILE}`);
    await writeFile(OUTPUT_FILE, JSON.stringify(result, null, ' '), 'utf8');

    console.log(INFO, 'Fet!');
    return 0;
  } catch (err) {
    console.log(ERROR, err);
  }
}

// Just call `main`
return main();


