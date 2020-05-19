<?php
require "util.php";

function write(string $path)
{
    global $data_directory;
    try {
        $body_string = file_get_contents('php://input');
        $body = json_decode($body_string);
        if ($body == NULL) {
            header("HTTP/1.1 400 Bad Request");
            print "The body must contain a valid JSON object.";
            die(1);
        }
    } catch (Exception $e) {
        header("HTTP/1.1 400 Bad Request");
        print $e->getMessage();
        die(1);
    }
    try {
        ensureAccessOrDie($path, $body);

        if (property_exists($body, 'content')) {
            // write contents to a file
            try {
                replaceFileExclusive("{$data_directory}$path", $body);
            } catch (BadRequestException $e) {
                header("HTTP/1.1 400 Bad Request");
                print $e->getMessage();
                die(1);
            } catch (TagConflictException $e) {
                header("HTTP/1.1 409 Conflict");
                print $e->getMessage();
                die(1);
            }
        } else if (property_exists($body, 'access')) {
            // create a directory with new access policy
            replaceFileExclusive("{$data_directory}$path/access.json", $body->access);
            header("HTTP/1.1 201 Created");
        } else {
            header("HTTP/1.1 400 Bad Request");
            print "Either 'content' or 'access' must be specified.";
            die(1);
        }
    } catch (Exception $e) {
        header("HTTP/1.1 500 Internal Server Error");
        print $e->getMessage();
        die(1);
    }
}

/**
 * @param string $path string filename to ensure access to (relative to data dir, starts with a slash)
 * @param $body object containing the key property
 * @param bool $write true to check write access (default), false to check read access
 */
function ensureAccessOrDie(string $path, $body, bool $write = true): void
{
    global $data_directory;
    $body=(object)$body;
    if ($body === NULL || !property_exists($body, "key") || !isset($body->key)) {
        header("HTTP/1.1 401 Unauthorized");
        print "No key found to check access to this file.";
        die(1);
    }

    $dir = dirname($path);
    $access_file = "{$data_directory}{$dir}/access.json";
    if (!file_exists($access_file)) {
        header("HTTP/1.1 404 Not Found");
        print "Cannot find access policy for '$dir' ($access_file).";
        die(1);
    }
    $access = json_decode(file_get_contents($access_file));
    if ($access == NULL) {
        header("HTTP/1.1 404 Not Found");
        print "Cannot read access policy for '$dir'.";
        die(1);
    }
    $properties = $write ? ['write_key'] : ['read_key', 'write_key'];
    if (!array_reduce($properties, function (bool $previous, string $property) use ($access, $body): bool {
        return $previous || (property_exists($access, $property) && $body->key == $access->$property);
    }, false)) {
        header("HTTP/1.1 403 Access Denied");
        print "The key is not authorized to write to this file.";
        die(1);
    }
}
function read(string $path)
{
    global $data_directory;
    ensureAccessOrDie($path, $_GET, false);
    print file_get_contents("{$data_directory}$path");
}

function create(string $path)
{
    write($path);
}

?>