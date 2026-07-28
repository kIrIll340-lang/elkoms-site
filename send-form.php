<?php

date_default_timezone_set('Europe/Moscow');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function reply($status, $ok, $message)
{
    http_response_code($status);

    echo json_encode(
        [
            'ok' => $ok,
            'message' => $message,
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

function clean($value)
{
    $value = trim($value);

    $cleaned = preg_replace(
        '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u',
        '',
        $value
    );

    return $cleaned !== null ? $cleaned : '';
}

function text_length($value)
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }

    preg_match_all('/./us', $value, $matches);

    return count($matches[0]);
}

function text_slice($value, $start, $length)
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, $start, $length, 'UTF-8');
    }

    preg_match_all('/./us', $value, $matches);

    return implode('', array_slice($matches[0], $start, $length));
}

$requestMethod = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';

if ($requestMethod !== 'POST') {
    reply(405, false, 'Разрешён только POST-запрос.');
}

session_start();

/*
 * Настройки сайта и почты.
 *
 * Заявки приходят на обычную почту elkoms2022@mail.ru.
 * Письма отправляются от созданного в Beget ящика
 * site@elkoms2022.ru.
 */
$siteName = 'ЭлКомС';
$siteDomain = 'elkoms2022.ru';

$recipient = 'elkoms2022@mail.ru';
$sender = 'site@elkoms2022.ru';

$name = clean((string) (isset($_POST['name']) ? $_POST['name'] : ''));
$phone = clean((string) (isset($_POST['phone']) ? $_POST['phone'] : ''));
$message = clean((string) (isset($_POST['message']) ? $_POST['message'] : ''));
$website = clean((string) (isset($_POST['website']) ? $_POST['website'] : ''));
$consent = (string) (isset($_POST['consent']) ? $_POST['consent'] : '');
$privacyVersion = clean(
    (string) (isset($_POST['privacy_version']) ? $_POST['privacy_version'] : 'не указана')
);
$startedAt = (int) (isset($_POST['started_at']) ? $_POST['started_at'] : 0);

/*
 * Honeypot.
 * Обычный пользователь это поле не видит и не заполняет.
 */
if ($website !== '') {
    reply(200, true, 'Заявка отправлена.');
}

/*
 * Защита от слишком быстрой автоматической отправки.
 */
$currentTimeMs = (int) round(microtime(true) * 1000);
$elapsedMs = $currentTimeMs - $startedAt;

if ($startedAt <= 0 || $elapsedMs < 1800) {
    reply(
        429,
        false,
        'Форма отправлена слишком быстро. Повторите попытку.'
    );
}

/*
 * Не разрешаем повторную отправку чаще одного раза
 * в 45 секунд в рамках одной сессии.
 */
$lastSubmit = (int) (isset($_SESSION['last_form_submit']) ? $_SESSION['last_form_submit'] : 0);

if ($lastSubmit > 0 && time() - $lastSubmit < 45) {
    reply(
        429,
        false,
        'Заявка уже отправлялась. Подождите немного и повторите попытку.'
    );
}

/*
 * Проверка имени.
 */
$nameLength = text_length($name);

if ($name === '' || $nameLength < 2 || $nameLength > 80) {
    reply(422, false, 'Укажите корректное имя.');
}

/*
 * Проверка телефона.
 */
$phoneDigits = preg_replace('/\D+/', '', $phone);
$phoneDigits = $phoneDigits !== null ? $phoneDigits : '';
$phoneLength = strlen($phoneDigits);

if ($phoneLength < 10 || $phoneLength > 15) {
    reply(422, false, 'Укажите корректный номер телефона.');
}

/*
 * Проверка комментария.
 */
if (text_length($message) > 1500) {
    reply(422, false, 'Комментарий слишком длинный.');
}

/*
 * Проверка согласия на обработку персональных данных.
 */
if ($consent !== '1') {
    reply(
        422,
        false,
        'Необходимо согласие на обработку персональных данных.'
    );
}

/*
 * Ограничиваем длину служебных данных.
 */
if (text_length($privacyVersion) > 40) {
    $privacyVersion = text_slice($privacyVersion, 0, 40);
}

$ip = clean((string) (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'не определён'));
$userAgent = clean(
    (string) (isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'не определён')
);

if (text_length($userAgent) > 500) {
    $userAgent = text_slice($userAgent, 0, 500);
}

$date = date('d.m.Y H:i:s');

$subject = 'Новая заявка с сайта ' . $siteDomain;

$body = "Новая заявка с сайта {$siteName}\n\n"
    . "Имя: {$name}\n"
    . "Телефон: {$phone}\n"
    . "Комментарий: "
    . ($message !== '' ? $message : 'не указан')
    . "\n\n"
    . "Согласие на обработку персональных данных: получено\n"
    . "Редакция политики: {$privacyVersion}\n"
    . "Дата и время: {$date}\n"
    . "IP-адрес: {$ip}\n"
    . "User-Agent: {$userAgent}\n";

$encodedSiteName = '=?UTF-8?B?'
    . base64_encode($siteName)
    . '?=';

$encodedSubject = '=?UTF-8?B?'
    . base64_encode($subject)
    . '?=';

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . $encodedSiteName . ' <' . $sender . '>',
    'Reply-To: ' . $sender,
    'X-Mailer: PHP/' . PHP_VERSION,
];

$sent = mail(
    $recipient,
    $encodedSubject,
    $body,
    implode("\r\n", $headers)
);

if (!$sent) {
    error_log(
        'Elkoms contact form: mail() returned false'
    );

    reply(
        500,
        false,
        'Не удалось отправить заявку. Позвоните нам по номеру +7 (903) 174-14-68.'
    );
}

$_SESSION['last_form_submit'] = time();

reply(
    200,
    true,
    'Заявка отправлена. Мы свяжемся с вами в ближайшее время.'
);
