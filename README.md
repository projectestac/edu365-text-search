# edu365-text-search
Full text search utilities for websites with static pages.

This project was initially created for [edu365.cat](http://edu365.cat/), a portal with educational content promoted by the Department of Education of the Government of Catalonia. The site was originally built with static HTML pages, and therefore did not have any search engine. "edu365-text-search" extracts the text content of the entire site and provides a simple search API. It uses a shared Google spreadsheet as a backend for URLs, titles, descriptors and significative words of the site pages.

The project was made upon the following components:

- [Express](https://expressjs.com/) as a HTTP API server.
- [Fuse.js](https://fusejs.io/) as a search engine.
- [Google Sheets API](https://developers.google.com/sheets/api/) as a backend.
- [Puppeteer](https://developers.google.com/web/tools/puppeteer/) as a live parser to extract all the text of the site HTML pages.
- [Winston](https://github.com/winstonjs/winston) as advanced logging system.
- [PM2](http://pm2.keymetrics.io/) to launch and monitor the API server.

To use this app you must first create a Google Spreadsheet with a single page named "pages". This page should have a first row with the following column titles:

| column        | cell content                                                                                                   | editable |
|---------------|----------------------------------------------------------------------------------------------------------------|:--------:|
| `path`        | Relative path to each page on the site                                                                         | ✔        |
| `title`       | The page title                                                                                                 | ✔        |
| `descriptors` | Optional descriptors for each page, separed by blank spaces                                                    | ✔        |
| `lang`        | ISO 639-1 language code of the page (currently not used)                                                       | ✔        |
| `js`          | A true/false switch indicating if the page needs to execute JavaScript to build its final content              | ✔        |
| `enabled`     | Another true/false switch, used to exclude specific pages from the search                                      | ✔        |
| `etag`        | This is where the indexer stores the current [HTTP ETag](https://en.wikipedia.org/wiki/HTTP_ETag) of each page | ❌       |
| `url`         | Final URL of the page, usually made with a calc formula like: `="http://edu365.cat" & A2`                      | ❌       |
| `text`        | This is where the search engine stores the word list of each page                                              | ❌       |

You should fill-in the first 6 colums of this spreadsheet with the pages to be indexed, one row per page.

Then, you must obtain the __OAuth2 credentials__ from the [Google API console](https://console.developers.google.com/). These credentials should be downloaded in a file named `credentials.json` and stored on this project root folder. You should also enable the [Google Sheets API](https://developers.google.com/sheets/api/quickstart/js) for a user having read and write rights on this sheet.

The next step is to make a copy of the provided file `.env-example` with the name `.env`.

Then, edit `.env` and fill-in the field `SPREADSHEET_ID` with the identifier of your spreadsheet (the part between `/spreadsheets/d/` and `/edit` of the spreadsheet URL). You should also write a random text on the `AUTH_SECRET` field. Other settings like the `APP_PORT`, `LOG_LEVEL` or `LOG_FILE` can be set at this stage.

Finally, install the NPM dependencies of the project:

```bash
# Go to the main project directory:
$ cd path/to/edu365-text-search

# Install the required npm components:
$ npm install
```

Launch the server using NPM:
```bash
$ cd path/to/edu365-text-search
$ npm start
```

In order to build the index, launch this URL on your preferred browser:
```
http://localhost:%APP_PORT%/build-index?auth=%AUTH_SECRET%
```
... replacing `%APP_PORT%` and `%AUTH_SECRET%` by the real values of these variables in `.env`.

To perform a query, just use this URL:
```
http://localhost:%APP_PORT%/q=%QUERY_TEXT%
```

