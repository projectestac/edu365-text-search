
const { google } = require('googleapis');

async function updateCell(auth, id, page, cell, value) {
  
  // TODO: get cell from a page structure
  const range=`${page}!${cell}:${cell}`;

  return new Promise(function (resolve, reject) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        range,
        values: [
          [value]
        ],
      },
      auth,
    }, (err, res) => {
      if (err)
        reject(err);
      resolve(res);
    });
  });
}

module.exports = updateCell;