<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Разрешён только POST-запрос.'], JSON_UNESCAPED_UNICODE);
    exit;
}

session_start();

function reply(int $status, bool $ok, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function clean(string $value): string
{
    $value = trim($value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    return $value;
}

// Настройки: замените адрес при необходимости.
$recipient = 'elkoms2022@mail.ru';
$siteName = 'ЭлКомс';
$siteDomain = 'elkoms2022.ru';

$name = clean((string)($_POST['name'] ?? ''));
$phone = clean((string)($_POST['phone'] ?? ''));
$message = clean((string)($_POST['message'] ?? ''));
$website = clean((string)($_POST['website'] ?? ''));
$consent = (string)($_POST['consent'] ?? '');
$startedAt = (int)($_POST['started_at'] ?? 0);

// Honeypot: обычный пользователь это поле не видит.
if ($website !== '') {
    reply(200, true, 'Заявка отправлена.');
}

// Боты часто отправляют форму мгновенно.
$elapsedMs = (int)round(microtime(true) * 1000) - $startedAt;
if ($startedAt <= 0 || $elapsedMs < 1800) {
    reply(429, false, 'Форма отправлена слишком быстро. Повторите попытку.');
}

$lastSubmit = (int)($_SESSION['last_form_submit'] ?? 0);
if ($lastSubmit > 0 && time() - $lastSubmit < 45) {
    reply(429, false, 'Заявка уже отправлялась. Подождите немного и повторите попытку.');
}

if ($name === '' || mb_strlen($name) < 2 || mb_strlen($name) > 80) {
    reply(422, false, 'Укажите корректное имя.');
}

$phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
if (strlen($phoneDigits) < 10 || strlen($phoneDigits) > 15) {
    reply(422, false, 'Укажите корректный номер телефона.');
}

if (mb_strlen($message) > 1500) {
    reply(422, false, 'Комментарий слишком длинный.');
}

if ($consent !== '1') {
    reply(422, false, 'Необходимо согласие на обработку персональных данных.');
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'не определён';
$userAgent = clean((string)($_SERVER['HTTP_USER_AGENT'] ?? 'не определён'));
$date = date('d.m.Y H:i:s');

$subject = 'Новая заявка с сайта ' . $siteDomain;
$body = "Новая заявка с сайта {$siteName}\n\n"
    . "Имя: {$name}\n"
    . "Телефон: {$phone}\n"
    . "Комментарий: " . ($message !== '' ? $message : 'не указан') . "\n\n"
    . "Дата: {$date}\n"
    . "IP: {$ip}\n"
    . "User-Agent: {$userAgent}\n";

// Для PHP mail() From должен быть адресом на вашем домене.
// После создания почты в Beget замените no-reply на реальный ящик, например site@elkoms2022.ru.
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . $siteName . ' <no-reply@' . $siteDomain . '>',
    'Reply-To: no-reply@' . $siteDomain,
    'X-Mailer: PHP/' . PHP_VERSION,
];

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$sent = mail($recipient, $encodedSubject, $body, implode("\r\n", $headers));

if (!$sent) {
    error_log('Elkoms form: mail() returned false');
    reply(500, false, 'Не удалось отправить заявку. Позвоните нам по номеру +7 (903) 174-14-68.');
}

$_SESSION['last_form_submit'] = time();
reply(200, true, 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.');
