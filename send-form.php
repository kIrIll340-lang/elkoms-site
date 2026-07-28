<?php

declare(strict_types=1);

date_default_timezone_set('Europe/Moscow');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function reply(int $status, bool $ok, string $message): never
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

function clean(string $value): string
{
    $value = trim($value);

    return preg_replace(
        '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u',
        '',
        $value
    ) ?? '';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
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

$name = clean((string) ($_POST['name'] ?? ''));
$phone = clean((string) ($_POST['phone'] ?? ''));
$message = clean((string) ($_POST['message'] ?? ''));
$website = clean((string) ($_POST['website'] ?? ''));
$consent = (string) ($_POST['consent'] ?? '');
$privacyVersion = clean(
    (string) ($_POST['privacy_version'] ?? 'не указана')
);
$startedAt = (int) ($_POST['started_at'] ?? 0);

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
$lastSubmit = (int) ($_SESSION['last_form_submit'] ?? 0);

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
$nameLength = mb_strlen($name);

if ($name === '' || $nameLength < 2 || $nameLength > 80) {
    reply(422, false, 'Укажите корректное имя.');
}

/*
 * Проверка телефона.
 */
$phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
$phoneLength = strlen($phoneDigits);

if ($phoneLength < 10 || $phoneLength > 15) {
    reply(422, false, 'Укажите корректный номер телефона.');
}

/*
 * Проверка комментария.
 */
if (mb_strlen($message) > 1500) {
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
if (mb_strlen($privacyVersion) > 40) {
    $privacyVersion = mb_substr($privacyVersion, 0, 40);
}

$ip = clean((string) ($_SERVER['REMOTE_ADDR'] ?? 'не определён'));
$userAgent = clean(
    (string) ($_SERVER['HTTP_USER_AGENT'] ?? 'не определён')
);

if (mb_strlen($userAgent) > 500) {
    $userAgent = mb_substr($userAgent, 0, 500);
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
