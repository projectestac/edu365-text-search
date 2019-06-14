<?php

// ** Proxy settings ** //
define('USE_PROXY', false); // 'true' in FMO
define('PROXY_HOST', 'squid');
define('PROXY_PORT', 3128);

// ** MySQL settings ** //
define('DB_HOST', 'mysql');
define('DB_NAME', 'edu365search');
define('DB_USER', 'fts');
define('DB_PASSWORD', 'fts');
define('DB_CHARSET', 'utf8');
define('DB_COLLATE', '');

// ** Languages currently used in this repository ** //
define('LANGS', ['ca']);

// ** Possible MySQL full text search methods ** //
define('FTS_METHODS', ['natural', 'boolean']);

// Current process UID
define('UID', posix_geteuid());
