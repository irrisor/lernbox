<?php

define('MAX_FILE_SIZE', 1024 * 1024);
$data_directory = "../../data";

class BadRequestException extends Exception
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
 * @throws BadRequestException if the input parameters cannot be used
 * @throws TagDoesNotMatchException if the If-Match header does not match the files tag
 */
function replaceFileExclusive(string $filename, object $content, bool $with_metadata = true)
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
                    if ($expected_tag === NULL) {
                        throw new BadRequestException("Can only replace content when ETag header is given.");
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
                    fwrite($handle, json_encode($content));
                }
                ftruncate($handle, ftell($handle));
                return $previous_body !== NULL ? $previous_body->content : NULL;
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

?>