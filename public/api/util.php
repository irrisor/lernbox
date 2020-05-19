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

class TagConflictException extends Exception
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}

/**
 * Replace contents of a file and return the previous contents.
 * @param $filename string short file name
 * @param $body object {content, expect_tag, tag}
 * @return string old file contents
 * @throws Exception if file cannot be written
 * @throws BadRequestException if the input parameters cannot be used
 * @throws TagConflictException if the expected_tag does not match the file tag
 */
function replaceFileExclusive(string $filename, object $body)
{
    $has_metadata = property_exists($body, "content");
    if ($has_metadata && !property_exists($body, "tag")) {
        throw new BadRequestException("Can only store content when 'tag' is given.");
    }

    $handle = fopen($filename, "c+");
    if (!$handle) {
        throw new Exception("Failed to open file!");
    }
    try {
        // wait until we can exclusively write to that file
        if (flock($handle, LOCK_EX)) {
            try {
                $previous_body = json_decode(fread($handle, MAX_FILE_SIZE));
                if ($has_metadata && ($previous_body !== NULL)) {
                    if (!property_exists($body, "expect_tag")) {
                        throw new BadRequestException("Can only replace content when 'expect_tag' is given.");
                    }
                    if ($previous_body->tag != $body->expect_tag) {
                        throw new TagConflictException($previous_body->tag);
                    }
                }

                rewind($handle);
                fwrite($handle, json_encode($has_metadata ? (object)[
                    "content" => $body->content,
                    "tag" => $body->tag,
                ] : $body));
                ftruncate($handle, ftell($handle));
                return $previous_body;
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