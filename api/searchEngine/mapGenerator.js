const gs = require('../utils/google/gSpreadsheetUtils');
const { getOauth2Client } = require('../utils/google/oAuth2Utils');

/**
 * Generates the Google Spreadsheet the Search Engine needs to work using the 
 * Edu365 Map Google Spreadsheet
 * 
 * @param {String} credentialsPath - JSON file containing the OAuth2 credentials
 * @param {String} tokenPath - File with the token provided by the Google APIs when authorized for first time
 * @param {String} autoSpreadSheetId - The auto generated Google spreadsheet ID
 * @param {String} autoSpreadSheetId - The Edu365 Map Google spreadsheet ID
 * @param {String} spreadSheetPage - The sheet name
 * @param {String[]} scope - Array of API scopes for wich this credentials are requested
 * @param {Object} logger - A Winston object
 */
async function generateMap(credentialsPath, tokenPath, autoSpreadSheetId, eduMapSpreadSheetId, spreadSheetPage, scope, logger) {
  const startTime = new Date().getTime();
  const auth = await getOauth2Client(credentialsPath, tokenPath, scope, logger);
  logger.info('Starting EDU365 map creation...');

  // Get spreadsheets title and url for both eduMapSpreadSheetId and autoSpreadSheetId
  let [source, dest] = await Promise.all([
    gs.getSpreadSheetTitleAndUrl(auth, eduMapSpreadSheetId),
    gs.getSpreadSheetTitleAndUrl(auth, autoSpreadSheetId)
  ]);
  logger.info(`SOURCE: ${source.title}`);
  logger.verbose(`${source.url}`);
  logger.info(`DESTINATION: ${dest.title}`);
  logger.verbose(`${dest.url}`);

  // Extract eduMapSpreadSheetId spreadsheet pages data.
  const sourcePages = ['INFANTIL', 'PRIMÀRIA', 'ESO', 'BATXILLERAT', '+EDU'];
  logger.info(`Getting source pages: ${sourcePages}`);
  let getSheetDataPromises = [];
  sourcePages.forEach(page => {
    getSheetDataPromises.push(gs.getSheetData(auth, eduMapSpreadSheetId, page, true));
  });
  let sheetsData = await Promise.all(getSheetDataPromises);

  // Post-proccess extracted data
  let totalRows = [];
  const headersRow = ['Url', 'Activitat', 'Area', 'Descriptors'];
  totalRows.push([...headersRow, 'Etapa']);  // Add 'Etapa' header

  for (let i = 0; i < sheetsData.length; i++) {
    logger.info(`Proccessing source page: ${sourcePages[i]}`);
    let rows = sheetsData[i].rows;

    // Only consider rows with Activitat and Url values
    rows = rows.filter(r => r.Activitat && r.Activitat.trim() && r.Url && r.Url.trim());
    rows.forEach(r => {
      let row = [];
      headersRow.forEach(h => row.push((r[h] || '').trim()));
      row.push(sourcePages[i]);  // Add 'Etapa' value
      totalRows.push(row);
    });
    logger.info(`Found ${rows.length} items`);
  }

  // TODO: Backup destination page before cleaning it
  // Clean autoSpreadSheetId spreadSheetPage
  logger.info('Cleaning DESTINATION spreedsheet');
  await gs.cleanSpreadSheetData(auth, autoSpreadSheetId, spreadSheetPage);

  // Write data into autoSpreadSheetId spreadSheetPage
  logger.info('Writing data in DESTINATION spreedsheet');
  await gs.writeRows(auth, autoSpreadSheetId, spreadSheetPage, totalRows);

  const endTime = new Date().getTime();
  const elapsedSecs = (endTime - startTime) / 1000;
  logger.info(`EDU365 map creation finished - ${totalRows.length - 1} items proccessed in ${elapsedSecs} secs.`);
}

module.exports = {
  generateMap
};