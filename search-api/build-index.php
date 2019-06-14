<?php

/**
 * File: build-index.php
 * 
 * Scans all 'project.json' files indicated by the repository index (projects.json)
 * storing descriptions and other relevant data on the database.
 * 
 * PHP Version 7
 * 
 * @category Service
 * @package  RepoSearch
 * @author   Francesc Busquets <francesc@gmail.com>
 * @license  https://eupl.eu/1.2/en/ EUPL-1.2
 * @link     https://github.com/projectestac/edu365-text-search
 */

require_once 'config.php';
require_once 'log.php';

$startTime = time();

// Main process:
print("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Updating database</title></head><body><code><pre>\n");

// Set-up database connection:
$dbConn = new PDO(
    'mysql:dbname='.DB_NAME.
    ';host='.DB_HOST.
    ';charset=utf8',
    DB_USER, DB_PASSWORD
);

// Build prepared statements:
$stmtQuery = $dbConn->prepare('SELECT path,etag FROM texts WHERE path=:path');
$stmtQuery->bindParam(':path', $path);

$stmtInsertPage = $dbConn->prepare(
    'INSERT INTO texts(path,lang,title,bodytext,descriptors,etag) '.
    'VALUES (:path,:lang,:title,:bodytext,:descriptors,:etag)'
);
$stmtInsertPage->bindParam(':path', $path);
$stmtInsertPage->bindParam(':lang', $lang);
$stmtInsertPage->bindParam(':title', $title);
$stmtInsertPage->bindParam(':bodytext', $bodytext);
$stmtInsertPage->bindParam(':descriptors', $descriptors);
$stmtInsertPage->bindParam(':etag', $etag);

$stmtDeleteText = $dbConn->prepare(
    'DELETE FROM texts WHERE texts.path = :path'
);
$stmtDeleteText->bindParam(':path', $path);


// Read allwords.json

$allwords = file_get_contents('allwords.json');
$pages = json_decode($allwords, false);
$numPages = count($pages);
$countUpdate = 0;
$countSkip = 0;

print("Processing $numPages pages\n------------\n");
foreach($pages as $page) {
  $path = $page->{'path'};
  $title = $page->{'title'};
  $descriptors = $page->{'descriptors'};
  $lang = $page->{'lang'};
  $etag = $page->{'etag'};
  $bodytext = $page->{'words'};

  // Check if registry exists or is newer     
  $stmtQuery->execute();
  $row = $stmtQuery->fetch();
  $currentETag = $row ? $row['etag'] : "";
  if (!$row || $currentETag !== $etag) {
    print("[x] Updating page $path ($title)\n");
    $stmtDeleteText->execute();
    $stmtInsertPage->execute();
    $countUpdate++;
  } else {
    print("[ ] Page $path ($title) is up to date.\n");
    $countSkip++;
  }
}

$timeSpent = time() - $startTime;
print("------------\n$countUpdate pages updated and $countSkip pages skipped in $timeSpent seconds.\n");
print('</pre></code></body></html>');

logMsg('INDEX', $countUpdate.' pages updated and '.$countSkip.' pages skipped in '.$timeSpent.' seconds');

