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
 * Get value from all header in a case insensitive way.
 * @param $name string header key
 * @return string|null header value
 */
function header_value($name): ?string
{
    $name = strtolower($name);
    $headers = array_change_key_case(getallheaders());
    $server_key = "REDIRECT_HTTP_" . str_replace("-", "_", strtoupper($name));
    return array_key_exists($name, $headers) ? $headers[$name] : (
    array_key_exists($server_key, $_SERVER) ? $_SERVER[$server_key] :
        NULL);
}

/**
 * Replace contents of a file and return the previous contents.
 * @param $filename string short file name
 * @param $content object|array content to be json encoded
 * @param bool $with_metadata
 * @return string old file contents
 * @throws Exception if file cannot be written
 * @throws MissingETagButExistentFileException if the input parameters cannot be used
 * @throws TagDoesNotMatchException if the If-Match header does not match the files tag
 */
function replaceFileExclusive(string $filename, $content, bool $with_metadata = true): string
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
                    $expected_tag = header_value('If-Match');
                    header("ETag: $previous_body->tag");
                    header("X-ETag: $previous_body->tag");
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
                    header("X-ETag: $etag");
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
 * @return array with keys user and password from the current request's Authorization header
 */
function requestBasicAuth()
{
    $authorization_exploded = getAuthorizationHeaderExploded();
    $base64 = count($authorization_exploded) === 2 && $authorization_exploded[0] == "Basic" ? $authorization_exploded[1] : NULL;
    $exploded = explode(":", base64_decode($base64));
    return count($exploded) > 1 ? ['user' => $exploded[0], 'password' => $exploded[1]] : NULL;
}

/**
 * @return array
 */
function getAuthorizationHeaderExploded(): array
{
    $authorization = header_value('Authorization');
    if ($authorization === NULL) {
        header("HTTP/1.1 401 Unauthorized");
        print "No Authorization header found to check access to this file.";
        die(1);
    }
    $authorization_exploded = explode(' ', $authorization, 2);
    return $authorization_exploded;
}

function readAccessFile(string $path)
{
    global $data_directory;

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
    return $access->content;
}

/**
 * @param string $path string filename to ensure access to (relative to data dir, starts with a slash)
 * @param bool $write true to check write access (default), false to check read access
 */
function ensureAccessOrDie(string $path, bool $write = true, bool $delete = false): void
{
    $key = requestKey();

    $access = readAccessFile($path);

    if (!$key) {
        $auth = requestBasicAuth();
        $password = $auth['password'];
        $username = $auth['user'];
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
                    ['method' => 'login', 'login' => $username, 'password' => $password, 'is_online' => 0],
                ]);
                if ($result and is_array($result) and ($result[0]['return'] === 'OK')) {
                    $key = property_exists($access, "write_key") ? $access->write_key : NULL;

                    $session_id = $result[1]['session_id'];
                    $group_ids = array_map(fn($member) => $member['login'], array_filter($result[0]['member'],
                        fn($member) => $member['type'] == 18 || $member['type'] == 19));

//                    error_log("Requesting group member of $username: " . json_encode($group_ids));
                    $result = $client->request(array_merge([
                            ['method' => 'set_session', 'session_id' => $session_id]
                        ], call_user_func_array('array_merge', array_map(fn($group_id) => [
                            ['method' => 'set_focus', 'object' => 'members', 'login' => $group_id],
                            ['method' => 'get_users']
                        ]
                            , $group_ids)), [
                            ['method' => 'logout']
                        ])
                    );

                    if ($result and is_array($result) and ($result[0]['return'] === 'OK')) {
                        $groups = array_map(
                            fn($group_id, $index) => [
                                'group_id' => $group_id,
                                'group_name' => $result[1 + $index * 2]['user']['name_hr'],
                                'pupils' => array_map(fn($user) => [
                                    'user_id' => $user['login'],
                                    'user_name' => $user['name_hr'],
                                ],
                                    array_values(array_filter($result[2 + $index * 2]['users'], fn($member) => $member['type'] == 1))
                                ),
                            ], $group_ids, array_keys($group_ids));
                        $groups = array_values(array_filter($groups, fn($group) => count($group['pupils']) > 0));

                        global $data_directory;
                        if (basename($path) == $username) {
                            $dir = $path;
                            mkdir("{$data_directory}$dir");
                        } else {
                            $dir = dirname($path);
                        }
                        $groups_file = "{$data_directory}{$dir}/groups.json";

//                        error_log("Writing group pupils of $username: " . json_encode($groups));
                        replaceFileExclusive($groups_file, $groups, false);
                    } else {
                        error_log("Requesting user groups failed! Response is " . json_encode($result));
                    }
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