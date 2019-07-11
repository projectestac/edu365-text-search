/*!
 *  File    : logToresponse.js
 *  Created : 19/06/2019
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  Transport for  winston loggers, used with HTML responses
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

const Transport = require('winston-transport');
const isStream = require('is-stream');

/**
 * Custom Transport for [winston](https://github.com/winstonjs/winston) loggers,
 * useful to stream the log messages of any process to a 
 * [http.ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse), like
 * the `res` objects used by [Express](https://expressjs.com/).
 * 
 * Usage:
 * - Build a LogToResponse object.
 * - Attach this object to your winston logger with `logger.add`
 * - Optionally, call `startLog` on the LogToResponse object
 * - Launch the process using the winston logger
 * - Optionally, call `endLog` on the LogToResponse object
 * 
 * CSS classes:
 * Lines outputted in HTML mode make use of the following class names:
 * - `.log` - On the main ol/ul block
 * - `.info` - Used on the ' info' span.
 * - `.meta` - Used on the ' meta' span, if any.
 */
class LogToResponse extends Transport {
  /**
   * Class constructor
   * @param {object} options - An object with the following attributes:
   * - `response`: A writable stream, usually of type `http.ServerResponse`
   * - `html`: When `true`, log messages will be outputed in HTML format as a `li` elements.
   * - `num`: When `true`, an HTML element of type `ol` will be used in `startLog`. Otherwise, `ul` is used.
   * - `eol`: The end-of-line string used. defaults to '\n'
   * - `meta`: An optional array of `meta` fields that should be included in the log. Usually containing only 'timestamp'.
   */
  constructor({ response, html = false, num = false, eol = '\n', meta = [] }) {
    super({});
    this.response = response;
    this.html = html;
    this.num = num;
    this.eol = eol;
    this.meta = meta;

    if (!response || !isStream(response)) {
      throw new Error('A writable stream should be declared as a "response" in options.');
    }
  }

  /**
   * Called by winston when there are something to log
   * @param {object} info - A winston [info](https://github.com/winstonjs/winston#streams-objectmode-and-info-objects) object.
   * @param {function} callback - A function to be called at the end of this log action
   */
  log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    const { level, message } = info;
    const meta = this.meta.map(m => info[m]).filter(m => typeof m !== 'undefined').join(' | ');

    if (this.html)
      this.response.write(`<li data-level="${level}">${meta ? `[<span class="meta">${meta}</span>] ` : ''}<span class="level">${level}</span> ${message}</li>${this.eol}`);
    else
      this.response.write(`${meta ? `[${meta}] ` : ''}${level} - ${message}${this.eol}`);

    if (callback)
      callback();
  }

  /**
   * Writes out the HTML code needed at the beggining of log blocks.
   */
  startLog() {
    if (this.html)
      this.response.write(`<${this.num ? 'ol' : 'ul'} class="log" >${this.eol}`);
  }

  /**
   * Writes out the HTML code needed at the end of log blocks.
   */
  endLog() {
    if (this.html)
      this.response.write(`</${this.num ? 'ol' : 'ul'}>${this.eol}`);
  }

}

LogToResponse.CSS = `
<style type="text/css">

  .log {
    font-family: monospace;
  }
  
  ul.log {
    list-style-type: none;
  }

  .log .level {
    font-weight: bold;
  }

  .log li[data-level="verbose"] {
    font-style: italic;
  }

  .log li[data-level="verbose"] .level {
    color: darkorange;
  }

  .log li[data-level="info"] .level {
    color: green;
  }
  
  .log li[data-level="error"] {
    font-weight: bold;
  }

  .log li[data-level="error"] .level {
    color: red;
  }

</style>
`;

module.exports = LogToResponse;
