<?php
include_once "util.php";

function delete(string $path)
{
    global $data_directory;
    ensureAccessOrDie($path, true, true);
    $local_path = "{$data_directory}$path";
    if (is_file($local_path)) {
        unlink($local_path);
    }
    if (is_dir($local_path)) {
        $files = scandir($local_path);
        if (count($files) !== 1 || $files[0] !== "access.json") {
            header("HTTP/1.1 409 Conflict");
            print "There are still files in this directory.";
            die(1);
        }
        unlink("$local_path/access.json");
        rmdir($local_path);
    } else {
        header("HTTP/1.1 404 Not Found");
        print "Unknown path '$path'";
        die(1);
    }
}

?>
