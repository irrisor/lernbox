<?php
require "write.php";

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (strpos($path, '/api') === 0) {
    $path = substr($path, 4);
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        create($path);
        break;
    case 'PUT':
        write($path);
        break;
    case 'GET':
        read($path);
        break;
    default:
        print "Method Not Allowed";
        header("HTTP/1.1 405 Method Not Allowed");
        die(1);
}
?>