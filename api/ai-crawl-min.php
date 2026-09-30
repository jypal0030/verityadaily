<?php
declare(strict_types=1);
$path = preg_replace('/[^a-z0-9\-]/', '', strtolower((string)($_GET['__path'] ?? '')));
$file = dirname(__DIR__) . '/' . $path . '.html';
if ($path === '' || !is_file($file)) { http_response_code(404); echo 'not found'; exit; }
header('X-AI-Report: minimal');
header('Content-Type: text/html; charset=UTF-8');
readfile($file);