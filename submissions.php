<?php
// Simple RSVP submissions viewer
// Access: http://IP:7000/submissions.php
// Optional basic auth — set a password below
$PASSWORD = 'vencanje2025';  // change this

if (isset($_SERVER['PHP_AUTH_PW'])) {
    if ($_SERVER['PHP_AUTH_PW'] !== $PASSWORD) {
        header('WWW-Authenticate: Basic realm="RSVP"');
        header('HTTP/1.0 401 Unauthorized');
        exit('Unauthorized');
    }
} else {
    header('WWW-Authenticate: Basic realm="RSVP"');
    header('HTTP/1.0 401 Unauthorized');
    exit('Unauthorized');
}

$file = __DIR__ . '/data/submissions.csv';
$rows = [];
if (file_exists($file)) {
    $fp = fopen($file, 'r');
    while (($row = fgetcsv($fp)) !== false) {
        $rows[] = $row;
    }
    fclose($fp);
}

$headers = array_shift($rows) ?: [];
$total_guests = 0;
$attending    = 0;
foreach ($rows as $r) {
    $att = strtolower($r[2] ?? '');
    if (strpos($att, 'да') !== false || strpos($att, 'ναι') !== false) {
        $attending++;
        $total_guests += intval($r[3] ?? 1);
    }
}
?><!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RSVP — Милан & Нина</title>
<style>
  body { font-family: Georgia, serif; background: #faf7f2; color: #1c1208; margin: 0; padding: 2rem; }
  h1   { font-weight: 300; font-style: italic; color: #4a5c33; font-size: 2rem; margin-bottom: 0.25rem; }
  .stats { display: flex; gap: 2rem; margin: 1.5rem 0 2rem; flex-wrap: wrap; }
  .stat  { background: white; border: 1px solid #ddd0b8; padding: 1rem 1.5rem; }
  .stat-n { font-size: 2rem; font-weight: 300; color: #c19a6b; }
  .stat-l { font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: #7a6a58; }
  table  { width: 100%; border-collapse: collapse; background: white; font-size: 0.9rem; }
  th     { background: #2e3b1f; color: #d4b896; padding: 0.75rem 1rem; text-align: left;
           font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 400; }
  td     { padding: 0.7rem 1rem; border-bottom: 1px solid #f0eae0; vertical-align: top; }
  tr:hover td { background: #fdfaf7; }
  .btn   { display: inline-block; margin-top: 1.5rem; padding: 0.6rem 1.5rem;
           background: #2e3b1f; color: #d4b896; text-decoration: none;
           font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; }
  .empty { text-align: center; padding: 3rem; color: #7a6a58; font-style: italic; }
</style>
</head>
<body>
<h1>Милан &amp; Нина — RSVP</h1>
<p style="color:#7a6a58;font-size:0.85rem">Укупно одговора: <?= count($rows) ?></p>

<div class="stats">
  <div class="stat"><div class="stat-n"><?= count($rows) ?></div><div class="stat-l">Одговора</div></div>
  <div class="stat"><div class="stat-n"><?= $attending ?></div><div class="stat-l">Долазе</div></div>
  <div class="stat"><div class="stat-n"><?= $total_guests ?></div><div class="stat-l">Укупно гостију</div></div>
</div>

<?php if (empty($rows)): ?>
  <div class="empty">Нема потврда.</div>
<?php else: ?>
<table>
  <thead>
    <tr>
      <?php foreach($headers as $h): ?><th><?= htmlspecialchars($h) ?></th><?php endforeach; ?>
    </tr>
  </thead>
  <tbody>
    <?php foreach(array_reverse($rows) as $row): ?>
    <tr>
      <?php foreach($row as $cell): ?><td><?= htmlspecialchars($cell) ?></td><?php endforeach; ?>
    </tr>
    <?php endforeach; ?>
  </tbody>
</table>
<?php endif; ?>

<a class="btn" href="data/submissions.csv" download>↓ Скини CSV</a>
</body>
</html>
