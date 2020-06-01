<?php

define('MAX_FILE_SIZE', 1024 * 1024);
$data_directory = "../../data";

class MissingETagButExistentFileException extends Exception
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}

class TagDoesNotMatchException extends Exception
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}

/**
 * Replace contents of a file and return the previous contents.
 * @param $filename string short file name
 * @param $content object
 * @return string old file contents
 * @throws Exception if file cannot be written
 * @throws MissingETagButExistentFileException if the input parameters cannot be used
 * @throws TagDoesNotMatchException if the If-Match header does not match the files tag
 */
function replaceFileExclusive(string $filename, object $content, bool $with_metadata = true): string
{
    $handle = fopen($filename, "c+");
    if (!$handle) {
        throw new Exception("Failed to open file!");
    }
    try {
        // wait until we can exclusively write to that file
        if (flock($handle, LOCK_EX)) {
            try {
                $previous_body = json_decode(fread($handle, MAX_FILE_SIZE));
                if ($with_metadata && $previous_body !== NULL) {
                    $expected_tag = array_key_exists('If-Match', getallheaders()) ? getallheaders()['If-Match'] : NULL;
                    header("ETag: $previous_body->tag");
                    if ($expected_tag === NULL) {
                        throw new MissingETagButExistentFileException("Can only replace content if If-Match header is given.");
                    }
                    if ($previous_body->tag != $expected_tag) {
                        throw new TagDoesNotMatchException($previous_body->tag);
                    }
                }

                rewind($handle);
                if ($with_metadata) {
                    $etag = hash("sha256", json_encode($content));
                    header("ETag: $etag");
                    fwrite($handle, json_encode((object)[
                        "tag" => $etag,
                        "content" => $content]));
                } else {
                    $etag = "";
                    fwrite($handle, json_encode($content));
                }
                ftruncate($handle, ftell($handle));
                return $etag;
            } finally {
                flock($handle, LOCK_UN);
            }
        } else {
            throw new Exception("Locking $filename failed.");
        }
    } finally {
        fclose($handle);
    }
    return "";
}

/**
 * Read contents of a file.
 * @param $filename string short file name
 * @return string current file contents
 * @throws Exception if file cannot be read
 */
function readFileExclusive($filename)
{
    global $data_directory;
    $handle = fopen("$data_directory$filename", "r");
    if (!$handle) {
        throw new Exception("Failed to open file!");
    }
    try {
        // wait until we can exclusively read that file
        if (flock($handle, LOCK_EX)) {
            try {
                $contents = fread($handle, MAX_FILE_SIZE);
                return $contents;
            } finally {
                flock($handle, LOCK_UN);
            }
        } else {
            throw new Exception("Locking $filename failed.");
        }
    } finally {
        fclose($handle);
    }
    return "";
}


/**
 * @param string $path string filename to ensure access to (relative to data dir, starts with a slash)
 * @param bool $write true to check write access (default), false to check read access
 */
function ensureAccessOrDie(string $path, bool $write = true, bool $delete = false): void
{
    global $data_directory;
    $key = request_key();

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
    if (!property_exists($access, "content")) {
        header("HTTP/1.1 500 Internal Server Error");
        print "Cannot read access policy for '$dir'.";
        die(1);
    }
    $access = $access->content;
    $properties = ['admin_key'];
    if (!$delete) {
        array_push($properties, 'write_key');
        if (!$write) {
            array_push($properties, 'read_key');
        }
    }
    if (!array_reduce($properties, function (bool $previous, string $property) use ($access, $key): bool {
        return $previous || (property_exists($access, $property) && $key == $access->$property);
    }, false)) {
        header("HTTP/1.1 403 Access Denied");
        print "The key is not authorized to perform the operation on this file.";
        die(1);
    }
}
?>