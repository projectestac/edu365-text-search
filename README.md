# edu365-text-search
Full text search utilities for websites with static pages.

This project was initially created for [edu365.cat](http://edu365.cat/), a portal with educational content promoted by the Department of Education of the Government of Catalonia. The site was originally built with static HTML pages, and therefore did not have any search engine. "edu365-text-search" extracts the text content of the entire site and provides a simple search API. It uses a shared Google spreadsheet as a backend for URLs, titles, descriptors and significative words of the site pages.

You will need [NodeJS](https://nodejs.org) installed on your system in order to build the main application.

The project was made upon the following components:

- [Express](https://expressjs.com/) as a HTTP API server.
- [Fuse.js](https://fusejs.io/) as a search engine.
- [Google Sheets API](https://developers.google.com/sheets/api/) as a backend.
- [Puppeteer](https://developers.google.com/web/tools/puppeteer/) as a live parser to extract all the text of the site HTML pages.
- [Winston](https://github.com/winstonjs/winston) as advanced logging system.
- [PM2](http://pm2.keymetrics.io/) to launch and monitor the API server.

### Build the Google spreadsheet

To use this app you must first create a Google Spreadsheet with a sheet named "pages". This page should have the following column titles in row `A`:

| Column name   | Cell content                                                                                                   | type     |
|---------------|----------------------------------------------------------------------------------------------------------------|:--------:|
| `path`        | Relative path to each page on the site                                                                         | manual   |
| `title`       | The page title                                                                                                 | manual   |
| `descriptors` | Optional descriptors for each page, separed by blank spaces                                                    | manual   |
| `lang`        | ISO 639-1 language code of the page (currently not used)                                                       | manual   |
| `js`          | A true/false switch indicating if the page needs to execute JavaScript to build its final content              | manual   |
| `enabled`     | Another true/false switch, used to exclude specific pages from the search                                      | manual   |
| `etag`        | This is where the indexer stores the current [HTTP ETag](https://en.wikipedia.org/wiki/HTTP_ETag) of each page | auto     |
| `url`         | Final URL of the page, usually made with a calc formula like: `="http://edu365.cat" & A2`                      | auto     |
| `text`        | This is where the search engine stores the word list of each page                                              | auto     |

Fill-in the path, title and other data for all the URLs that should be indexed. The three last columns will be automatically filled and must be left blank.

### Credential settings

You must obtain a set of __OAuth2 credentials__ from the [Google API console](https://console.developers.google.com/). These credentials should be downloaded in a file named `credentials.json` and stored on the project root folder. You must also enable the [Google Sheets API](https://developers.google.com/sheets/api/quickstart/js) for a user having read and write rights on this sheet.

The next step will be to make a duplicate of the file `.env-example`, calling it `.env`.

Edit `.env` and set the value of `SPREADSHEET_ID` to the identifier of your spreadsheet (the part between `/spreadsheets/d/` and `/edit` of the spreadsheet URL). You should also write a random text on `AUTH_SECRET`. Other settings like the `APP_PORT`, `LOG_LEVEL` or `LOG_FILE` are optional.

### Build the main application

Install the dependencies using NPM or Yarn:

```bash
# Go to the main project directory:
$ cd path/to/edu365-text-search

# Install the required npm components:
$ npm install
```

Then launch the server using NPM:
```bash
$ cd path/to/edu365-text-search
$ npm start
```

### Basic usage

After every edit of any page on the site, this URL should be launched on your browser:
```
http://%HOST%:%APP_PORT%/build-index?auth=%AUTH_SECRET%
```
... replacing `%HOST%` by the host name or IP (usually 'localhost' on the development environment) and `%APP_PORT%`, `%AUTH_SECRET%` by the real values of these variables in `.env`.

To perform a query, just use this URL:
```
http://%HOST%:%APP_PORT%/q=%QUERY_TEXT%
```

You will find examples of a search form and results page in `/test`.

### Advanced settings

This application uses [Fuse.js](https://fusejs.io/) by [Kiro Risk](https://kiro.me/) to perform search queries. Fuse has a lot of specific settings that can be adjusted to fit your needs. The settings currently used by edu365-text-search are:

```javascript
// See file: /search/FullTextSearch.js
FullTextSearch.DEFAULT_SEARCH_OPTIONS = {
  caseSensitive: false,
  shouldSort: true,
  tokenize: true,
  matchAllTokens: true,
  includeScore: false,
  includeMatches: false,
  threshold: 0.2,
  location: 0,
  distance: 4,
  maxPatternLength: 32,
  minMatchCharLength: 2,
};
```

Please check out [Fuse.js](https://fusejs.io/) for a full description of each option.



## License
"Edu365 text search" is an open source development made by the Department of Education of the Government of Catalonia, released under the terms of the [European Union Public Licence v. 1.2](https://eupl.eu/1.2/en/).


