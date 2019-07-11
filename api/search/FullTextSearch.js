
const Fuse = require('fuse.js');


class FullTextSearch {

  constructor(siteData, fuseOptions = FullTextSearch.DEFAULT_SEARCH_OPTIONS) {
    this.fuse = new Fuse(
      siteData,
      { ...fuseOptions, keys: ['text','titol','descriptors'] }
    );
  }

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




