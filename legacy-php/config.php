<?php
$servername = getenv('DB_HOST') ?: "localhost";
$username = getenv('DB_USER') ?: "root";
$password = getenv('DB_PASSWORD') ?: "";
$dbname = getenv('DB_NAME') ?: "osp_db";
$dbport = (int)(getenv('DB_PORT') ?: 3306);

$conn = new mysqli($servername, $username, $password, $dbname, $dbport);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>