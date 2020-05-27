<?php
include_once "util.php";

function write(string $path, object $body)
{
    global $data_directory;
    try {
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
        $dir = dirname($path);
        if ($dir === $path) {
            header("HTTP/1.1 400 Bad Request");
            print "Cannot locate parent directory of '$path'.";
            die(1);
        }
        if (!is_dir("{$data_directory}$dir")) {
            write($dir, (object)[
                "access" => (object)["admin_key" => request_key()]
            ]);
        }
        ensureAccessOrDie($path);

        $local_path = "{$data_directory}$path";
        if (property_exists($body, 'access')) {
            // create a directory with new access policy
            mkdir($local_path);
            replaceFileExclusive("{$data_directory}$path/access.json", (object)[
                "admin_key" => request_key(),
                "write_key" => property_exists($body, "write_key") ? $body->write_key : NULL,
                "read_key" => property_exists($body, "read_key") ? $body->read_key : NULL,
            ]);
        } else {
            // write contents to a file and print new hash
            try {
                print replaceFileExclusive($local_path, $body);
            } catch (MissingETagButExistentFileException $e) {
                header("HTTP/1.1 409 Conflict");
                print $e->getMessage();
                die(1);
            } catch (TagDoesNotMatchException $e) {
                header("HTTP/1.1 412 Precondition Failed");
                print $e->getMessage();
                die(1);
            }
        }
    } catch (Exception $e) {
        header("HTTP/1.1 500 Internal Server Error");
        print $e->getMessage();
        die(1);
    }
}

/**
 * @return string|null key from the current request's Authorization header
 */
function request_key()
{
    $authorization = array_key_exists('Authorization', getallheaders()) ? getallheaders()['Authorization'] : NULL;
    if ($authorization === NULL) {
        header("HTTP/1.1 401 Unauthorized");
        print "No Authorization header found to check access to this file.";
        die(1);
    }
    $authorization_exploded = explode(' ', $authorization, 2);
    $key = count($authorization_exploded) === 2 && $authorization_exploded[0] == "Bearer" ? $authorization_exploded[1] : NULL;
    return $key;
}

?>