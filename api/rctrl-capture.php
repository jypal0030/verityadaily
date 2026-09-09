<?php
/**
 * rctrl (RankControl) -> Veritya Daily webhook endpoint v2.1
 *
 * POST /api/rctrl-capture.php?k=<URL_KEY>
 * Verified when config is present:
 *   Authorization: Bearer <whsec>
 *   X-RankControl-Signature: sha256=<HMAC-SHA256(raw body, keyed with whsec)>
 *   X-RankControl-Event: article.published | article.updated | test
 * Body: {"event":string,"timestamp":number,"article":Article}
 *
 * v2.1: header fallbacks (apache_request_headers / REDIRECT_HTTP_AUTHORIZATION),
 *       401 diagnostics (no secret material exposed).
 */

declare(strict_types=1);

const URL_KEY = 'b8f17f2dbe956b2fb330aa79a5556165';

function rctrl_store_dir(): string
{
    $candidates = [
        dirname(__DIR__, 2) . '/rctrl-store',  // outside public_html (preferred, deploy-proof)
        __DIR__ . '/store',                    // fallback inside webroot (denied via .htaccess)
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

function rctrl_load_whsec(string $store): string
{
    $file = $store . '/rctrl-config.php';
    if (!is_file($file)) { return ''; }
    $cfg = include $file;
    return is_array($cfg) ? (string)($cfg['whsec'] ?? '') : '';
}

function rctrl_header(string $name): string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    $v = (string)($_SERVER[$key] ?? '');
    if ($v === '' && function_exists('apache_request_headers')) {
        $hdrs = array_change_key_case(apache_request_headers() ?: [], CASE_LOWER);
        $v = (string)($hdrs[strtolower($name)] ?? '');
    }
    if ($v === '' && $name === 'authorization' && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $v = (string)$_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    return trim($v);
}

function rctrl_log(string $store, array $entry): void
{
    $file = $store . '/rctrl-payloads.jsonl';
    if (is_file($file) && filesize($file) > 2097152) { @rename($file, $file . '.old'); }
    @file_put_contents($file, json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
}

// ---- request gates ----
$k = $_GET['k'] ?? '';
if (!hash_equals(URL_KEY, (string)$k)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/null', true);
    echo json_encode(['ok' => false, 'error' => 'POST only']);
    exit;
}

$store = rctrl_store_dir();
$whsec = rctrl_load_whsec($store);
$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'empty body']);
    exit;
}

$auth = rctrl_header('authorization');
$sig  = rctrl_header('x-rctrl-signature');
$evHeader = rctrl_header('x-rctrl-event');

$bearerOk = $whsec !== '' && hash_equals('Bearer ' . $whsec, $auth);
$sigOk = false;
if ($whsec !== '' && preg_match('/^sha256=([0-9a-fA-F]{64})$/', $sig, $m)) {
    $sigOk = hash_equals(hash_hmac('sha256', $raw, $whsec), strtolower($m[1]));
}
$verified = $whsec !== '' && $bearerOk && $sigOk;

$parsed = json_decode($raw, true);
$event = is_array($parsed) ? (string)($parsed['event'] ?? $evHeader) : $evHeader;
$tsBody = is_array($parsed) ? ($parsed['timestamp'] ?? null) : null;
$stale = false;
if (is_int($tsBody) || is_numeric($tsBody)) {
    $ts = (int)$tsBody;
    if ($ts > 0 && $ts < 1000000000000) { $stale = abs(time() + -1 * $tsBody) > 900; }
}

$diag = [
    'auth_present' => $auth !== '',
    'auth_prefix' => substr($auth, 0, 10),
    'auth_len' => strlen($auth),
    'sig_present' => $sig !== '',
    'sig_prefix' => substr($sig, 0, 11),
    'sig_len' => strlen($sig),
];

$entry = [
    'ts' => gmdate('c'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    'mode' => $whsec !== '' ? 'signed' : 'capture',
    'verified' => $verified,
    'bearer_ok' => $bearerOk,
    'sig_ok' => $sigOk,
    'stale' => $stale,
    'event' => $event,
    'event_header' => $evHeader,
    'body_timestamp' => $tsBody,
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
    'body_bytes' => strlen($raw),
    'is_valid_json' => $parsed !== null,
    'diag' => $diag,
    'body' => $parsed !== null ? $parsed : $raw,
];
rctrl_log($store, $entry);

header('Content-Type: application/json');
if ($whsec !== '' && !$verified) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized', 'diag' => $diag]);
    exit;
}
echo json_encode(['ok' => true, 'mode' => $whsec !== '' ? 'signed' : 'capture', 'event' => $event, 'received' => gmdate('c')]);
