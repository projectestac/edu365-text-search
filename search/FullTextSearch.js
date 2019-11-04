/*!
 *  File    : FulltextSearch.js
 *  Created : 15/06/2019
 *  By      : Francesc Busquets <francesc@gmail.com>
 *
 *  Provide a full text engine, currently based on [Fuse.js](https://fusejs.io)
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

const Fuse = require('fuse.js');

/**
 * Encapsulates operations related to full text search, using a [Fuse.js](https://fusejs.io/) object
 */
class FullTextSearch {

  /**
   * Initialize the Fuse.js object
   * @param {Object[]} siteData - Array of objects containing the following fields: `url`, `title`, `descriptors`, `lang` and `text`
   * @param {Object+} fuseOptions - Optional object with miscellaneous Fuse.js options. See: https://fusejs.io
   */
  constructor(siteData, fuseOptions = FullTextSearch.DEFAULT_SEARCH_OPTIONS) {
    this.fuse = new Fuse(
      siteData, {...fuseOptions, keys: ['Activitat', 'Descriptors'] }
    );
  }

  /**
   * Perform a text search
   * @param {String} query - The query string
   * @returns {Object[]} - An array of objects matching the query string
   */
  search(query) {
    return this.fuse.search(query);
  }

}

// See: https://fusejs.io/
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

module.exports = FullTextSearch;
