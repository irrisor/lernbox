<?php
try {
    require "write.php";
    require "read.php";
    require "delete.php";

    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path_exploded = explode("/", $path);
    $path_exploded_length = count($path_exploded);
    if ($path_exploded_length < 3 || $path_exploded[1] !== "api") {
        header("HTTP/1.1 400 Bad Request");
        print "Only paths below /api/ are valid, not '$path'." . json_encode($path_exploded);
        die(1);
    }
    $path_secured = "/" . join("/", array_merge(array_map(function ($segment) {
            return preg_replace("/[^a-zA-Z0-9]/", "_", $segment);
        }, array_slice($path_exploded, 2, $path_exploded_length - 3)),
            [preg_replace("/[^a-zA-Z0-9]/", "_", $path_exploded[$path_exploded_length - 1])]));
    if (strpos($path, '/api') === 0) {
        $path = substr($path, 4);
    }
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'POST':
        case 'PUT':
            $body_string = file_get_contents('php://input');
            $body = json_decode($body_string);
            write($path_secured, $body);
            break;
        case 'GET':
            read($path_secured);
            break;
        case 'DELETE':
            delete($path_secured);
            break;
        default:
            header("HTTP/1.1 405 Method Not Allowed");
            print "Method Not Allowed";
            die(1);
    }
} catch (Exception $e) {
    header("HTTP/1.1 500 Internal Server Error");
    print $e;
}
?>
