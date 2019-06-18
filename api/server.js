
require('dotenv').config();
const express = require('express');
const test = require('./test');

const { createLogger, format, transports } = require('winston');
const { checkSite } = require('./extractor/checkSite');

const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH;
const TOKEN_PATH = process.env.TOKEN_PATH;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SPREADSHEET_PAGE = process.env.SPREADSHEET_PAGE;
const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];
const BASE_URL = process.env.BASE_URL;

const logger = createLogger({
  format: format.combine(
    format.splat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
  ),
  level: 'debug',
  handleExceptions: true,
  transports: [
    new transports.File({ filename: 'log/combined.log' }),
    new transports.Console(),
  ],
});

const app = express();
const port = 8765;

app.get('/', async (req, res) => {

  res.write('<pre>\n');

  //logger.stream({start: -1}).on('log', log => res.write(log));

  logger.stream({start: -1}).on('log', log => console.log(`XXXXX ${log}`));
  
  //const trans=new transports.Stream({stream: res});
  //logger.add(trans);

  //const rows = await checkSite(CREDENTIALS_PATH, TOKEN_PATH, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger);

  await test(logger, 3000);

  res.write('-----------------------\n');
  res.write('Hello world in PRE mode\n');
  res.write('-----------------------\n');
  res.write('</pre>\n');
  res.write('Això és tot!');
  res.end();

  //logger.log('Procés acabat!');
});


app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

