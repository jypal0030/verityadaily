<?php
/**
 * rctrl pipeline status + setup - Veritya Daily  (v2.3.1)
 * GET  /api/rctrl-status.php?k=<URL_KEY>            -> config presence + recent deliveries summary
 * GET  /api/rctrl-status.php?k=<URL_KEY>&full=1     -> + last full log entry (raw payload)
 * GET  /api/rctrl-status.php?k=<URL_KEY>&since=N    -> entries from index N onward (FULL, for pollers)
 * POST /api/rctrl-status.php?k=<URL_KEY>
 *      body: {"action":"setup","whsec":"whsec_...","gh_token":"optional"}
 *      -> writes server-side config outside public_html (not in git)
 */

declare(strict_types=1);

const URL_KEY = 'b8f17f2dbe956b2fb330aa79a5556165';

function rctrl_store_dir(): string
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
    echo json_encode(['ok' => false, 'error' => 'rctrl-status forbidden']);
    exit;
}

$store = rctrl_store_dir();
$cfgFile = $store . '/rctrl-config.php';
$logFile = $store . '/rctrl-payloads.jsonl';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $raw = file_get_contents('php://input') ?: '';
    $in = json_decode($raw, true);
    if (!is_array($in) || ($in['action'] ?? '') !== 'setup') {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'expected {"action":"setup",...}']);
        exit;
    }
    $whsec = trim((string)($in['whsec'] ?? ''));
    $ghToken = trim((string)($in['gh_token'] ?? ''));
    if (!preg_match('/^whsec_[A-Za-z0-9_\-]{20,}$/', $whsec)) {
        http_response_code(422);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'whsec must match whsec_...']);
        exit;
    }
    $cfg = ['whsec' => $whsec, 'gh_token' => $ghToken, 'updated' => gmdate('c')];
    $php = "<?php\n// rctrl config - server-side only, never in git. Written " . gmdate('c') . "\nreturn " . var_export($cfg, true) . ";\n";
    $wrote = file_put_contents($cfgFile, $php, LOCK_EX) !== false;
    header('Content-Type: application/json');
    echo json_encode(['ok' => $wrote, 'config_written' => $wrote, 'gh_token_saved' => $ghToken !== '']);
    exit;
}

// ---- GET -> status ----
$whsec = '';
$ghTokenSaved = false;
if (is_file($cfgFile)) {
    $cfg = include $cfgFile;
    if (is_array($cfg)) {
        $whsec = (string)($cfg['whsec'] ?? '');
        $ghTokenSaved = trim((string)($cfg['gh_token'] ?? '')) !== '';
    }
}

$lines = is_file($logFile) ? (@file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []) : [];
$total = count($lines);

// &since=N -> full entries from index N (poller mode)
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
if ($total > 0 && isset($_GET['full'])) {
    $lastFull = json_decode($lines[$total - 1], true);
}
$tail = array_slice($lines, -10);
foreach ($tail as $line) {
    $e = json_decode($line, true);
    if (!is_array($e)) { continue; }
    $body = $e['body'] ?? null;
    $art = is_array($body) ? ($body['article'] ?? null) : null;
    $recent[] = [
        'ts' => $e['ts'] ?? null,
        'event' => $e['event'] ?? null,
        'verified' => $e['verified'] ?? false,
        'stale' => $e['stale'] ?? false,
        'bytes' => $e['body_bytes'] ?? null,
        'title' => is_array($art) ? ($art['title'] ?? null) : null,
        'slug' => is_array($art) ? ($art['slug'] ?? null) : null,
    ];
}
$recent = array_reverse($recent);

header('Content-Type: application/json');
$out = [
    'ok' => true,
    'config_present' => $whsec !== '',
    'whsec_fingerprint' => $whsec !== '' ? substr(sha1($whsec), 0, 10) : null,
    'gh_token_saved' => $ghTokenSaved,
    'deliveries_total' => $total,
    'recent' => $recent,
];
if ($lastFull !== null) { $out['last_full'] = $lastFull; }
echo json_encode($out);
