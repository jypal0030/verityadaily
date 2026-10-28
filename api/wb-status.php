<?php
/**
 * wb pipeline status + setup v1.0 - Veritya Daily
 * GET  /api/wb-status.php?k=<URL_KEY>          -> token presence + recent deliveries
 * GET  ...&full=1                              -> + last full entry (raw payload)
 * GET  ...&since=N                             -> entries from index N (FULL, poller mode)
 * POST /api/wb-status.php?k=<URL_KEY>
 *      body: {"action":"setup","token":"..."}  -> writes server-side wb-config.php (outside public_html, not in git)
 */

declare(strict_types=1);

const URL_KEY = 'e7b2c94a1d8f46b3a0c5e9d7f2b1a6c8';

function wb_store_dir(): string
{
    $candidates = [
        dirname(__DIR__, 2) . '/rctrl-store',
        __DIR__ . '/store',
    ];
    foreach ($candidates as $dir) {
        if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
        if (is_dir($dir) && is_writable($dir)) {
            if (strpos($dir, 'public_html') !== false) {
                @file_put_contents($dir . '/.htaccess', "Require all denied\n");
            }
            return $dir;
        }
    }
    return sys_get_temp_dir();
}

$k = $_GET['k'] ?? '';
if (!hash_equals(URL_KEY, (string)$k)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'wb-status forbidden']);
    exit;
}

$store = wb_store_dir();
$cfgFile = $store . '/wb-config.php';
$logFile = $store . '/wb-payloads.jsonl';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $raw = file_get_contents('php://input') ?: '';
    $in = json_decode($raw, true);
    if (!is_array($in) || ($in['action'] ?? '') !== 'setup') {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'expected {"action":"setup","token":"..."}']);
        exit;
    }
    $token = trim((string)($in['token'] ?? ''));
    if (strlen($token) < 20) {
        http_response_code(422);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'token must be at least 20 chars']);
        exit;
    }
    $cfg = ['token' => $token, 'updated' => gmdate('c')];
    $php = "<?php\n// wb integration config - server-side only, never in git. Written " . gmdate('c') . "\nreturn " . var_export($cfg, true) . ";\n";
    $wrote = file_put_contents($cfgFile, $php, LOCK_EX) !== false;
    header('Content-Type: application/json');
    echo json_encode(['ok' => $wrote, 'config_written' => $wrote]);
    exit;
}

$token = '';
if (is_file($cfgFile)) {
    $cfg = include $cfgFile;
    if (is_array($cfg)) { $token = (string)($cfg['token'] ?? ''); }
}

$lines = is_file($logFile) ? (@file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []) : [];
$total = count($lines);

if (isset($_GET['since'])) {
    $since = max(0, (int)$_GET['since']);
    $out = [];
    for ($i = $since; $i < $total; $i++) {
        $e = json_decode($lines[$i], true);
        if (is_array($e)) { $out[] = $e; }
    }
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'total' => $total, 'since' => $since, 'entries' => $out]);
    exit;
}

$recent = [];
$lastFull = null;
if ($total > 0 && isset($_GET['full'])) { $lastFull = json_decode($lines[$total - 1], true); }
foreach (array_slice($lines, -10) as $line) {
    $e = json_decode($line, true);
    if (!is_array($e)) { continue; }
    $recent[] = [
        'ts' => $e['ts'] ?? null,
        'event' => $e['event'] ?? null,
        'verified' => $e['verified'] ?? false,
        'is_test' => $e['is_test'] ?? false,
        'bytes' => $e['body_bytes'] ?? null,
        'title' => $e['title'] ?? null,
        'slug' => $e['slug'] ?? null,
        'status' => $e['status'] ?? null,
    ];
}
$recent = array_reverse($recent);

$kgate = [];
for ($i = max(0, $total - 30); $i < $total; $i++) {
    $e = json_decode($lines[$i], true);
    if (is_array($e) && !empty($e['kgate_fail'])) {
        $kgate[] = ['ts' => $e['ts'] ?? null, 'ip' => $e['ip'] ?? null, 'k_len' => $e['k_len'] ?? null, 'k_prefix' => $e['k_prefix'] ?? null];
    }
}
$kgate = array_slice(array_reverse($kgate), 0, 5);

header('Content-Type: application/json');
$out = [
    'ok' => true,
    'config_present' => $token !== '',
    'token_fingerprint' => $token !== '' ? substr(sha1($token), 0, 10) : null,
    'deliveries_total' => $total,
    'recent' => $recent,
    'kgate_recent' => $kgate,
];
if ($lastFull !== null) { $out['last_full'] = $lastFull; }
echo json_encode($out);
