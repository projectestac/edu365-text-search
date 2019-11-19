
/*!
 *  File    : mapGenerator.js
 *  Created : 28/10/2019
 *  By      : Pepe Osca <josca2@xtec.cat>
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

const gs = require('../utils/gSpreadsheetUtils');
const { getOauth2Client } = require('../utils/oAuth2Utils');

async function generateMap(CREDENTIALS_PATH, TOKEN_PATH, AUTO_SPREADSHEET_ID, EDU_MAP_SPREADSHEET_ID, SPREADSHEET_ID, SPREADSHEET_PAGE, SCOPE, BASE_URL, logger) {
  const startTime = new Date().getTime()
  const auth = await getOauth2Client(CREDENTIALS_PATH, TOKEN_PATH, SCOPE, logger);
  logger.info('Starting EDU365 map creation...')

  // Get spreadsheets title and url. EDU_MAP_SPREADSHEET_ID, AUTO_SPREADSHEET_ID
  let [source, dest] = await Promise.all([
    gs.getSpreadSheetTitleAndUrl(auth, EDU_MAP_SPREADSHEET_ID),
    gs.getSpreadSheetTitleAndUrl(auth, AUTO_SPREADSHEET_ID)
  ])
  logger.info(`SOURCE: ${source.title}`);
  logger.verbose(`${source.url}`);
  logger.info(`DESTINATION: ${dest.title}`);
  logger.verbose(`${dest.url}`);

  // TODO: Backup destination page before cleaning it

  // Clean AUTO_SPREADSHEET_ID SPREADSHEET_PAGE
  let r = await gs.cleanSpreadSheetData(auth, AUTO_SPREADSHEET_ID, SPREADSHEET_PAGE);
  logger.info('Cleaning DESTINATION spreedsheet');

  // Extract EDU_MAP_SPREADSHEET_ID spreadsheet pages data.
  const sourcePages = ['INFANTIL', 'PRIMÀRIA', 'ESO', 'BATXILLERAT', 'TRANSVERSALS']
  logger.info(`Getting source pages: ${sourcePages}`)
  let getSheetDataPromises = []
  sourcePages.forEach(page => {
    getSheetDataPromises.push(gs.getSheetData(auth, EDU_MAP_SPREADSHEET_ID, page, true))
  })
  let sheetsData = await Promise.all(getSheetDataPromises)

  // Post-proccess extracted data
  let totalRows = []
  const headersRow = ['Url', 'Activitat', 'Area', 'Descriptors'];
  totalRows.push([...headersRow, 'Etapa'])  // Add 'Etapa' header

  for (let i = 0; i < sheetsData.length; i++) {
    logger.info(`Proccessing source page: ${sourcePages[i]}`)
    rows = sheetsData[i].rows
    rows = rows.filter(r => r.Activitat.trim() && r.Url.trim())
    rows.forEach(r => {
      let row = []
      headersRow.forEach(h => row.push((r[h] || '').trim()))
      row.push(sourcePages[i])  // Add 'Etapa' value
      totalRows.push(row)
    })
    logger.info(`Found ${rows.length} items`)
  }

  // Write data into AUTO_SPREADSHEET_ID SPREADSHEET_PAGE
  await gs.writeRows(auth, AUTO_SPREADSHEET_ID, SPREADSHEET_PAGE, totalRows)

  const endTime = new Date().getTime()
  const elapsedSecs = (endTime - startTime) / 1000;
  logger.info(`EDU365 map creation finished - ${totalRows.length - 1} items proccessed in ${elapsedSecs} secs.`)
}

module.exports = {
  generateMap
};