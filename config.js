require('dotenv').config();

let config = {
    CREDENTIALS_PATH: process.env.CREDENTIALS_PATH,
    TOKEN_PATH: process.env.TOKEN_PATH,
    SPREADSHEET_ID: process.env.SPREADSHEET_ID,
    EDU_MAP_SPREADSHEET_ID: process.env.EDU_MAP_SPREADSHEET_ID,
    AUTO_SPREADSHEET_ID: process.env.AUTO_SPREADSHEET_ID,
    SPREADSHEET_PAGE: process.env.SPREADSHEET_PAGE,
    SCOPE: ['https://www.googleapis.com/auth/spreadsheets'],
    BASE_URL: process.env.BASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    LOG_FILE: process.env.LOG_FILE,
    LOG_CONSOLE: process.env.LOG_CONSOLE !== 'false',
    LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
    APP_PORT: process.env.APP_PORT || 8080,
}

module.exports = Object.freeze(config);