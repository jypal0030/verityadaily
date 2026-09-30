<?php
/**
 * rctrl Step 7: AI crawler visit reporter + static page server (v1.0)
 * .htaccess rewrites AI-bot requests (non-search-engine) here; we report the visit
 * to rctrl (queue + best-effort flush) and serve the real .html content.
 * Googlebot/Bingbot intentionally stay on native serving (zero SEO risk).
 */
declare(strict_types=1);

function rctrl_store_dir(): string
{
    $dir = dirname(__DIR__, 2) . '/rctrl-store';
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
    return is_dir($dir) && is_writable($dir) ? $dir : sys_get_temp_dir();
}

function rctrl_whsec(): string
{
    $f = rctrl_store_dir() . '/rctrl-config.php';
    if (!is_file($f)) { return ''; }
    $cfg = include $f;
    return is_array($cfg) ? (string)($cfg['whsec'] ?? '') : '';
}

$path = preg_replace('/[^a-z0-9\-]/', '', strtolower((string)($_GET['__path'] ?? '')));
$file = dirname(__DIR__) . '/' . $path . '.html';
if ($path === '' || !is_file($file)) { http_response_code(404); header('Content-Type: text/plain'); echo 'not found'; exit; }

// ---- queue the visit (fast, local, never blocks serving) ----
$ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200);
$entry = json_encode(['ua' => $ua, 'path' => '/' . $path, 'ts' => time()]);
$queue = rctrl_store_dir() . '/crawl-queue.jsonl';
@file_put_contents($queue, $entry . "\n", FILE_APPEND | LOCK_EX);

// ---- best-effort flush (bounded: max 3 posts, 1.5s timeout each) ----
$whsec = rctrl_whsec();
if ($whsec !== '' && is_file($queue)) {
    $lines = @file($queue, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    if (count($lines) >= 10 || mt_rand(1, 5) === 1) {
        $fp = fopen($queue . '.lock', 'w');
        if ($fp && flock($fp, LOCK_EX | LOCK_NB)) {
            $remain = $lines;
            $posted = 0;
            foreach ($lines as $i => $line) {
                if ($posted >= 3) { break; }
                $e = json_decode($line, true);
                if (!is_array($e)) { unset($remain[$i]); continue; }
                $ctx = stream_context_create(['http' => [
                    'method' => 'POST',
                    'header' => "content-type: application/json\r\nx-rankcontrol-key: " . $whsec . "\r\n",
                    'content' => json_encode(['user_agent' => $e['ua'], 'path' => $e['path']]),
                    'timeout' => 1.5,
                    'ignore_errors' => true,
                ]]);
                $resp = @file_get_contents('https://api.rctrl.com/api/site/crawl', false, $ctx);
                if ($resp !== false && strpos((string)$resp, '"ok":true') !== false) { unset($remain[$i]); $posted++; }
                else { break; } // API down -> keep queue, try next time
            }
            if ($posted > 0) { @file_put_contents($queue, implode("\n", array_values($remain)) . (count($remain) ? "\n" : ''), LOCK_EX); }
            flock($fp, LOCK_UN);
        }
        if ($fp) { fclose($fp); }
    }
}

// ---- serve the real page ----
header('Content-Type: text/html; charset=UTF-8');
header('X-AI-Report: queued'); // v1.0.1 verification marker (harmless)
header('Content-Length: ' . (string)filesize($file));
readfile($file);
