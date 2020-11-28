<?php
include_once "util.php";

function read(string $path)
{
    global $data_directory;
    ensureAccessOrDie($path, false);
    $file_name = "{$data_directory}$path";
    if ( is_file($file_name) ) {
        $file_object = json_decode(file_get_contents($file_name));
        if (is_object($file_object) && property_exists($file_object, "write_key")) {
            // don't expose our keys if someone can trick us to read access.json here
            header("HTTP/1.1 404 Not Found");
            print "Cannot access '$path'";
        } else if (is_object($file_object) && property_exists($file_object, "content")) {
            header("ETag: $file_object->tag");
            $expected_tag = header_value('If-None-Match');
            if ($expected_tag == $file_object->tag) {
                header("HTTP/1.1 304 Not Modified");
            } else {
                print json_encode($file_object->content);
            }
        } else {
            print json_encode($file_object);
        }
    } else {
        header("HTTP/1.1 404 Not Found");
        print "Cannot find '$path'";
    }
}

?>
