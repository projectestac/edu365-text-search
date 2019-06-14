<?php

/**
 * File: log.php
 * 
 * Stores log messages into the database
 * 
 * PHP Version 7
 * 
 * @category Service
 * @package  DB
 * @author   Francesc Busquets <francesc@gmail.com>
 * @license  https://eupl.eu/1.2/en/ EUPL-1.2
 * @link     https://github.com/projectestac/edu365-text-search
 */

require_once 'config.php';

// Useful for reducing sizes expressed in bytes to megabytes
define('MB', 1048576);

/**
 * Writes the provided log message to the databas
 * 
 * @param string $type The type of message (ERR, LOG...)
 * @param string $msg  The message
 * 
 * @return void
 */
function logMsg($type, $msg)
{
    // Set-up database connection:
    $dbConn = new PDO(
        'mysql:dbname='.DB_NAME.
        ';host='.DB_HOST.
        ';charset=utf8',
        DB_USER, DB_PASSWORD
    );

    $stmt = $dbConn->prepare('INSERT INTO log(`type`,`msg`) VALUES(:type,:msg)');    
    $stmt->bindParam(':type', $type, PDO::PARAM_STR);
    $stmt->bindParam(':msg', $msg, PDO::PARAM_STR);
    $stmt->execute();
}
