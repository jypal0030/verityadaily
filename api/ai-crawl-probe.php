<?php
// minimal probe: kya fatal ho raha hai - sections enable/disable
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '1');
header('Content-Type: text/plain');

echo "step1: store dir\n";
$dir = dirname(__DIR__, 2) . '/rctrl-store';
echo "dir: $dir\n";
echo "is_dir: " . var_export(is_dir($dir), true) . "\n";
if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
echo "writable: " . var_export(is_dir($dir) && is_writable($dir), true) . "\n";

echo "step2: whsec\n";
$f = $dir . '/rctrl-config.php';
$whsec = '';
if (is_file($f)) { $cfg = include $f; $whsec = is_array($cfg) ? (string)($cfg['whsec'] ?? '') : ''; }
echo "whsec len: " . strlen($whsec) . "\n";

echo "step3: queue write\n";
$q = $dir . '/crawl-queue.jsonl';
$w = @file_put_contents($q, json_encode(['ua' => 'probe', 'path' => '/probe', 'ts' => time()]) . "\n", FILE_APPEND | LOCK_EX);
echo "write result: " . var_export($w, true) . "\n";

echo "step4: lock\n";
$fp = @fopen($q . '.lock', 'w');
echo "fp: " . var_export((bool)$fp, true) . "\n";
if ($fp !== false) { echo "flock: " . var_export(flock($fp, LOCK_EX | LOCK_NB), true) . "\n"; flock($fp, LOCK_UN); fclose($fp); }

echo "step5: readfile\n";
$file = dirname(__DIR__) . '/ai-productivity-tools-2026.html';
echo "file exists: " . var_export(is_file($file), true) . "\n";
echo "ALL OK\n";
