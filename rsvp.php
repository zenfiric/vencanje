<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'Method not allowed']); exit; }

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) $data = $_POST;

$name     = trim(strip_tags($data['name']     ?? ''));
$attending= trim(strip_tags($data['attending']?? ''));
$guests   = max(0, intval($data['guests']     ?? 1));
$dietary  = trim(strip_tags($data['dietary']  ?? ''));
$message  = trim(strip_tags($data['message']  ?? ''));
$lang     = in_array($data['lang'] ?? '', ['sr','el']) ? $data['lang'] : 'sr';
$ip       = $_SERVER['REMOTE_ADDR'] ?? '';
$ts       = date('Y-m-d H:i:s');

if (empty($name)) {
    echo json_encode(['ok'=>false,'error'=>'Name required']);
    exit;
}

$file   = __DIR__ . '/data/submissions.csv';
$newFile = !file_exists($file);

if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0750, true);
}

$fp = fopen($file, 'a');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Storage error']);
    exit;
}

if ($newFile) {
    fputcsv($fp, ['Timestamp','Ime','Prisustvo','Br. gostiju','Dijeta/Alergije','Poruka','Jezik','IP']);
}

fputcsv($fp, [$ts, $name, $attending, $guests, $dietary, $message, $lang, $ip]);
fclose($fp);

echo json_encode(['ok'=>true]);
?>
