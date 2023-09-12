require('dotenv').config();

let config = {
  // JSON file containing the OAuth2 credentials  
  CREDENTIALS_PATH: process.env.CREDENTIALS_PATH,

  // File with the token provided by the Google APIs when authorized for first time
  TOKEN_PATH: process.env.TOKEN_PATH,

  // Google spreadsheet ID for the auto generated spreadsheet
  AUTO_SPREADSHEET_ID: process.env.AUTO_SPREADSHEET_ID,

  // Google Edu365 map spreadsheet ID
  EDU_MAP_SPREADSHEET_ID: process.env.EDU_MAP_SPREADSHEET_ID,

  // Spreadseet page name
  SPREADSHEET_PAGE: process.env.SPREADSHEET_PAGE,

  // Scope for Google Spreadsheets API
  SCOPE: ['https://www.googleapis.com/auth/spreadsheets'],

  // Auth secret
  AUTH_SECRET: process.env.AUTH_SECRET,

  // Log file path
  LOG_FILE: process.env.LOG_FILE,

  // Log to console (true|false)
  LOG_CONSOLE: process.env.LOG_CONSOLE !== 'false',

  // Log level
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

  // App port
  APP_PORT: process.env.APP_PORT || 8080,

  // Fuse.js search options. See: https://fusejs.io
  SEARCH_OPTIONS: {
    // Basic
    isCaseSensitive: false,
    includeScore: false,
    includeMatches: false,
    minMatchCharLength: 2,
    shouldSort: true,
    findAllMatches: false,
    keys: ['Activitat', 'Descriptors'],

    // Fuzzy
    location: 0,
    threshold: 0.3,
    distance: 100,

    // Advanced
    useExtendedSearch: false,
  },

  // Max length allowed in queries
  QUERY_MAX_LENGTH: process.env.QUERY_MAX_LENGTH || 128,

  // OAuth2 callback port
  OAUTH2_CALLBACK_PORT: process.env.OAUTH2_CALLBACK_PORT || 3000,
};

module.exports = Object.freeze(config);