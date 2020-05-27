<?php
include_once "util.php";

function read(string $path)
{
    global $data_directory;
    ensureAccessOrDie($path, false);
    $file_object = json_decode(file_get_contents("{$data_directory}$path"));
    if (property_exists($file_object, "write_key")) {
        // don't expose our keys if someone can trick us to read access.json here
        header("HTTP/1.1 404 Not Found");
        print "Cannot access '$path'";
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

?>
