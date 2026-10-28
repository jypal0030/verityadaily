<?php
/**
 * wb webhook capture v1.0 - Veritya Daily
 * New AI writing tool integration (events: post.created / post.updated).
 * SEPARATE from the rctrl pipeline: own log + own config, same store dir pattern.
 *
 * POST /api/wb-capture.php?k=<URL_KEY>
 *   - Authorization header may carry the integration token (raw or Bearer prefix)
 *   - v1 capture mode: every valid-key delivery is logged and answered 200 {ok:true}
 *     (strict token enforcement lands in v2 once the tool's real header format is seen)
 * Body schema: unknown at v1 - full body logged for publisher design.
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

function wb_load_token(string $store): string
{
    $file = $store . '/wb-config.php';
    if (!is_file($file)) { return ''; }
    $cfg = include $file;
    return is_array($cfg) ? (string)($cfg['token'] ?? '') : '';
}

function wb_header(string $name): string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    $v = (string)($_SERVER[$key] ?? '');
    if ($v === '' && function_exists('apache_request_headers')) {
        $hdrs = array_change_key_case(apache_request_headers() ?: [], CASE_LOWER);
        $v = (string)($hdrs[strtolower($name)] ?? '');
    }
    if ($v === '' && $name === 'authorization') {
        $v = (string)($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    }
    return trim($v);
}

function wb_log(string $store, array $entry): void
{
    $file = $store . '/wb-payloads.jsonl';
    if (is_file($file) && filesize($file) > 2097152) { @rename($file, $file . '.old'); }
    @file_put_contents($file, json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
}

function wb_pick(array $a, array $keys)
{
    foreach ($keys as $k) {
        if (isset($a[$k]) && is_scalar($a[$k]) && (string)$a[$k] !== '') { return (string)$a[$k]; }
    }
    return null;
}

// ---- GET: health (no secrets) ----
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'endpoint' => 'wb-capture', 'expects' => 'POST JSON (post.created / post.updated)', 'v' => '1.0']);
    exit;
}

// ---- k gate ----
$k = $_GET['k'] ?? '';
if (!hash_equals(URL_KEY, (string)$k)) {
    $store0 = wb_store_dir();
    @file_put_contents($store0 . '/wb-payloads.jsonl',
        json_encode(['ts' => gmdate('c'), 'ip' => $_SERVER['REMOTE_ADDR'] ?? '', 'kgate_fail' => true,
            'k_len' => strlen((string)$k), 'k_prefix' => substr((string)$k, 0, 6),
            'ua' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 80),
            'path' => $_SERVER['REQUEST_URI'] ?? '']) . "\n",
        FILE_APPEND | LOCK_EX);
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'POST only']);
    exit;
}

$store = wb_store_dir();
$tokenCfg = wb_load_token($store);
$raw = file_get_contents('php://input');

$auth = wb_header('authorization');
$tok = $auth;
if (stripos($tok, 'bearer ') === 0) { $tok = trim(substr($tok, 7)); }
$tokPresent = $tok !== '';
$tokOk = $tokenCfg !== '' && $tokPresent && hash_equals($tokenCfg, $tok);
$badTok = $tokenCfg !== '' && $tokPresent && !$tokOk;

$parsed = ($raw !== false && $raw !== '') ? json_decode($raw, true) : null;
$isValidJson = is_array($parsed);
$bodyArr = $isValidJson ? $parsed : [];

$event = wb_pick($bodyArr, ['event', 'type', 'action', 'eventType']);
if ($event === null) {
    $evHdr = wb_header('x-wb-event');
    if ($evHdr !== '') { $event = $evHdr; }
}
$isTest = $event !== null && stripos($event, 'test') !== false;
if (!$isTest && isset($bodyArr['test']) && $bodyArr['test'] === true) { $isTest = true; }

// find post container: common envelopes
$art = null;
foreach (['post', 'data', 'article', 'payload', 'model', 'object'] as $c) {
    if (isset($bodyArr[$c]) && is_array($bodyArr[$c])) { $art = $bodyArr[$c]; break; }
}
if ($art === null) { $art = $bodyArr; }
$title = wb_pick($art, ['title', 'name', 'post_title', 'subject']);
$slug = wb_pick($art, ['slug', 'handle', 'seo_slug']);
if ($slug === null && is_string($title) && $title !== '') {
    $slug = trim(strtolower((string)preg_replace('/[^A-Za-z0-9]+/', '-', $title)), '-');
}
$postId = wb_pick($art, ['id', 'post_id', 'uuid', 'documentId']);
$status = wb_pick($art, ['status', 'state', 'post_status']);

$entry = [
    'ts' => gmdate('c'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    'mode' => $tokenCfg !== '' ? 'token' : 'capture',
    'verified' => $tokOk,
    'token_ok' => $tokOk,
    'token_present' => $tokPresent,
    'bad_token' => $badTok,
    'is_test' => $isTest,
    'event' => $event,
    'post_id' => $postId,
    'title' => $title,
    'slug' => $slug,
    'status' => $status,
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
    'body_bytes' => strlen((string)$raw),
    'is_valid_json' => $isValidJson,
    'empty_body' => $raw === false || $raw === '',
    'body' => $isValidJson ? $bodyArr : (string)$raw,
];
wb_log($store, $entry);

header('Content-Type: application/json');
if ($badTok) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'bad-token', 'hint' => 'check the Authentication Token saved in the integration settings']);
    exit;
}
echo json_encode([
    'ok' => true,
    'endpoint' => 'wb-capture',
    'event' => $event,
    'is_test' => $isTest,
    'mode' => $tokenCfg !== '' ? 'token' : 'capture',
    'token_ok' => $tokOk,
    'title' => $title,
    'slug' => $slug,
    'received' => gmdate('c'),
    'v' => '1.0',
]);
