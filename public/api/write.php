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
        ensureAccessOrDie($path);

        $local_path = "{$data_directory}$path";
        if (is_file($local_path)) {
            // write contents to a file
            try {
                replaceFileExclusive($local_path, $body);
            } catch (BadRequestException $e) {
                header("HTTP/1.1 400 Bad Request");
                print $e->getMessage();
                die(1);
            } catch (TagDoesNotMatchException $e) {
                header("HTTP/1.1 412 Precondition Failed");
                print $e->getMessage();
                die(1);
            }
        } else if (property_exists($body, 'access')) {
            // create a directory with new access policy
            mkdir($local_path);
            replaceFileExclusive("{$data_directory}$path/access.json", $body);
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
 * @param bool $write true to check write access (default), false to check read access
 */
function ensureAccessOrDie(string $path, bool $write = true): void
{
    global $data_directory;
    $authorization = array_key_exists('Authorization', getallheaders()) ? getallheaders()['Authorization'] : NULL;
    if ($authorization === NULL) {
        header("HTTP/1.1 401 Unauthorized");
        print "No Authorization header found to check access to this file.";
        die(1);
    }
    $authorization_exploded = explode(' ', $authorization, 2);
    $key = count($authorization_exploded) === 2 && $authorization_exploded[0] == "Bearer" ? $authorization_exploded[1] : NULL;

    $dir = dirname($path);
    $access_file = "{$data_directory}{$dir}/access.json";
    if (!file_exists($access_file) || $path == $access_file) {
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
    if (!array_reduce($properties, function (bool $previous, string $property) use ($access, $key): bool {
        return $previous || (property_exists($access, $property) && $key == $access->$property);
    }, false)) {
        header("HTTP/1.1 403 Access Denied");
        print "The key is not authorized to write to this file.";
        die(1);
    }
}

function read(string $path)
{
    global $data_directory;
    ensureAccessOrDie($path, false);
    $file_object = json_decode(file_get_contents("{$data_directory}$path"));
    if (property_exists($file_object, "write_key")) {
        // don't expose our keys if someone can trick us to read access.json here
        header("HTTP/1.1 404 Not Found");
    } else if (property_exists($file_object, "content")) {
        header("ETag", $file_object->tag);
        $expected_tag = array_key_exists('If-None-Match', getallheaders()) ? getallheaders()['If-None-Match'] : NULL;
        if ($expected_tag == $file_object->tag) {
            header("HTTP/1.1 304 Not Modified");
        } else {
            print json_encode($file_object->content);
        }
    } else {
        print json_encode($file_object);
    }
}

function create(string $path)
{
    write($path);
}

?>