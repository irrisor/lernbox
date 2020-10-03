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
 * @return string|null key from the current request's Authorization header
 */
function requestKey()
{
    $key_exploded = getBearerExploded();
    return $key_exploded[0];
}

/**
 * @return array
 */
function getBearerExploded(): array
{
    $authorization_exploded = getAuthorizationHeaderExploded();
    $key = count($authorization_exploded) === 2 && $authorization_exploded[0] == "Bearer" ? $authorization_exploded[1] : NULL;
    $key_exploded = explode(":", $key);
    return $key_exploded;
}

/**
 * @return string|null key from the current request's Authorization header
 */
function requestAdditionalKey()
{
    $key_exploded = getBearerExploded();
    return count($key_exploded) > 1 ? $key_exploded[1] : NULL;
}

/**
 * @return string|null password from the current request's Authorization header
 */
function requestPassword()
{
    $authorization_exploded = getAuthorizationHeaderExploded();
    $base64 = count($authorization_exploded) === 2 && $authorization_exploded[0] == "Basic" ? $authorization_exploded[1] : NULL;
    $exploded = explode(":", base64_decode($base64));
    return count($exploded) > 1 ? $exploded[1] : NULL;
}

/**
 * @return array
 */
function getAuthorizationHeaderExploded(): array
{
    $authorization = array_key_exists('Authorization', getallheaders()) ? getallheaders()['Authorization'] : NULL;
    if ($authorization === NULL) {
        header("HTTP/1.1 401 Unauthorized");
        print "No Authorization header found to check access to this file.";
        die(1);
    }
    $authorization_exploded = explode(' ', $authorization, 2);
    return $authorization_exploded;
}

/**
 * @param string $path string filename to ensure access to (relative to data dir, starts with a slash)
 * @param bool $write true to check write access (default), false to check read access
 */
function ensureAccessOrDie(string $path, bool $write = true, bool $delete = false): void
{
    global $data_directory;
    $key = requestKey();

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

    if (!$key) {
        $password = requestPassword();
        $username = basename($path);
        $url = property_exists($access, "webweaverUrl") ? $access->webweaverUrl : NULL;
        if ($username && $password && $url) {

            try {
                $client = new SoapClient($url . 'soap.php?wsdl', array(
                    'encoding' => 'UTF-8',
                    'trace' => 1,
                    'features' => SOAP_SINGLE_ELEMENT_ARRAYS,
                    'exceptions' => 0
                ));

                $result = $client->request([
                    ['method' => 'login', 'login' => $username, 'password' => $password, 'get_properties' => [], 'is_online' => 0],
                    ['method' => 'logout']
                ]);
                if ($result and is_array($result) and ($result[0]['return'] === 'OK')) {
//                    print_r($result);
//                    print "\n";
                    $key = property_exists($access, "write_key") ? $access->write_key : NULL;
                } else {
                    header("HTTP/1.1 403 Access Denied");
                    print "Login at WebWeaver failed.";
                    print_r($result);
                    die(1);
                }
            } catch (SoapFault $e) {
                header("HTTP/1.1 500 Internal Server Error");
                print("Error in soap client");
                print_r($e);
                die(1);
            } catch (Exception $e) {
                header("HTTP/1.1 500 Internal Server Error");
                print("General error");
                print_r($e);
                die(1);
            }
        } else {
            header("HTTP/1.1 403 Access Denied");
            print "Neither key nor password is specified or cannot be checked.";
            die(1);
        }
    }

    $properties = ['admin_key'];
    if (!$delete) {
        array_push($properties, 'write_key');
        if (!$write) {
            array_push($properties, 'read_key');
        }
    }
    $access_key_matches = !array_reduce($properties, function (bool $previous, string $property) use ($access, $key): bool {
        return $previous || (property_exists($access, $property) && $key == $access->$property);
    }, false);
    if ($access_key_matches) {
        header("HTTP/1.1 403 Access Denied");
        print "The key is not authorized to perform the operation on this file.";
        die(1);
    }
}

?>