<?php
/**
 * rctrl -> Veritya Daily capture stub (v1)
 * Purpose: capture rctrl webhook test/real payloads to a JSONL log so we can
 * inspect the exact article JSON shape before building the full publisher.
 *
 * Endpoint: https://verityadaily.com/api/rctrl-capture.php?k=<RCTRL_DEBUG_KEY>
 * Method:   POST (any content-type). Body logged raw + parsed meta.
 * Security: requires ?k= matching RCTRL_DEBUG_KEY, otherwise 403.
 * Response: always 200 JSON {"ok":true} so rctrl treats delivery as success.
 */

declare(strict_types=1);

// --- config: shared secret (rotate later; keep out of public HTML) ---
const RCTRL_DEBUG_KEY = 'b8f17f2dbe956b2fb330aa79a5556165';

// --- 1. auth ---
$k = $_GET['k'] ?? '';
if (!hash_equals(RCTRL_DEBUG_KEY, (string)$k)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

// --- 2. read raw body ---
$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'empty body']);
    exit;
}

// --- 3. build log entry ---
$parsed = json_decode($raw, true);
$entry = [
    'ts' => gmdate('c'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    'method' => $_SERVER['REQUEST_METHOD'] ?? '',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
    'signature_headers' => [
        'x-rctrl-signature' => $_SERVER['HTTP_X_RCTRL_SIGNATURE'] ?? null,
        'x-signature' => $_SERVER['HTTP_X_SIGNATURE'] ?? null,
        'x-hub-signature-256' => $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? null,
        'x-rctrl-event' => $_SERVER['HTTP_X_RCTRL_EVENT'] ?? null,
    ],
    'is_valid_json' => $parsed !== null,
    'body_bytes' => strlen($raw),
    'body' => $parsed !== null ? $parsed : $raw,
];

// --- 4. append to JSONL log ---
$logDir = __DIR__ . '/logs';
if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
$logFile = $logDir . '/rctrl-payloads.jsonl';
@file_put_contents($logFile, json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);

// protect log dir once
@file_put_contents($logDir . '/.htaccess', "Require all denied\n");

// --- 5. respond ok ---
header('Content-Type: application/json');
echo json_encode(['ok' => true, 'captured' => true, 'bytes' => strlen($raw)]);
