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
                "access" => (object)["admin_key" => requestKey()]
            ]);
        }
        ensureAccessOrDie($path);

        $local_path = "{$data_directory}$path";
        if (property_exists($body, 'access')) {
            // create a directory with new access policy
            mkdir($local_path);
            $access = $body->access;
            $parent_access = readAccessFile($path);
            replaceFileExclusive("{$data_directory}$path/access.json", (object)[
                "admin_key" => requestKey(),
                "write_key" => property_exists($access, "write_key") ? $access->write_key : requestAdditionalKey(),
                "read_key" => property_exists($access, "read_key") ? $access->read_key : NULL,
                "webweaverUrl" => property_exists($parent_access, "webweaverUrl") ? $parent_access->webweaverUrl : NULL,
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

?>