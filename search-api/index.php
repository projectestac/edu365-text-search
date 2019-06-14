<?php
/**
 * File: index.php
 * 
 * Makes a query to the database and returns a list of pages matching
 * the specified expression against body text, title and/or "descriptors".
 * 
 * GET or POST params:
 * - q: The query expression (required)
 * - lang: The language to search. Current valid language is only "ca"
 * - method: Method to be used in full-text search. Possible values are "natural" or "boolean" (default)
 *           For more information about these methods see:
 *           https://dev.mysql.com/doc/refman/5.7/en/fulltext-search.html
 * 
 * PHP Version 7
 * 
 * @category Service
 * @package  Edu365TextSearch
 * @author   Francesc Busquets <francesc@gmail.com>
 * @license  https://eupl.eu/1.2/en/ EUPL-1.2
 * @link     https://github.com/projectestac/edu365-text-search
 */

require_once 'config.php';

$result = [];

// Read request params
$query = isset($_REQUEST['q']) ? $_REQUEST['q'] : null;
if ($query !== null && strlen($query) > 0) {
   
    // TODO: Log queries?

    $lang = isset($_REQUEST['lang']) ? $_REQUEST['lang'] : 'ca';
    if (!in_array($lang, LANGS)) {
        $lang = 'ca';
    }

    $method = isset($_REQUEST['method']) ? $_REQUEST['method'] : 'default';
    if (!in_array($method, FTS_METHODS)) {
        $method = 'natural';
    }

    $mode = $method === 'natural'
        ? ' IN NATURAL LANGUAGE MODE'
        : $method === 'boolean' ? ' IN BOOLEAN MODE' : '';

    // Set-up database connection and prepared statements:
    $dbConn = new PDO('mysql:dbname='.DB_NAME.';host='.DB_HOST.';charset=utf8', DB_USER, DB_PASSWORD); 
    
    // Build prepared statement:
    $stmtQuery = $dbConn->prepare(
        "SELECT * FROM texts WHERE lang='".$lang.
        "' AND MATCH(title,bodytext,descriptors) AGAINST (:query".$mode.")"
    );

    // Launch query
    $stmtQuery->bindParam(':query', $query);
    $stmtQuery->execute();
    
    // Collect results
    while ($row = $stmtQuery->fetch()) {    
        extract($row);
        $page = array(
          'path' => $path,
          'title'=> $title,
        );
        array_push($result, $page);
    }
}

// Send response
header('Content-Type: application/json;charset=UTF-8');
header('Access-Control-Allow-Origin: *');
print(json_encode($result));
