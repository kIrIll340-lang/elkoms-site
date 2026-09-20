# Elkoms Website

Production website developed for an electrical installation company.

🌐 **Live website:** https://elkoms2022.ru

## About

A responsive commercial website created to present the company's electrical installation services, completed projects and contact information.

The project was developed without frontend frameworks or build tools and is designed to run on standard PHP hosting.

## Features

- Responsive layout for desktop and mobile devices
- Interactive portfolio with project photo galleries
- Contact and lead submission forms
- PHP backend for email form delivery
- Yandex Metrica goal tracking
- SEO metadata, sitemap and robots.txt
- Custom 404 page
- HTTPS redirects and security headers via `.htaccess`
- Optimized project images

## Tech Stack

- HTML5
- CSS3
- JavaScript
- PHP
- Apache / `.htaccess`

## Project Structure

```text
.
├── index.html
├── send-form.php
├── 404.html
├── robots.txt
├── sitemap.xml
├── .htaccess
└── assets/
    ├── css/
    ├── js/
    └── images/﻿# Сайт «ЭлКомС»

Готовый одностраничный сайт без сборщиков и зависимостей. Работает на обычном виртуальном хостинге Beget.

## Структура

- `index.html` — вся разметка и SEO.
- `assets/css/styles.css` — дизайн и адаптивность.
- `assets/js/projects.js` — названия объектов и списки фотографий.
- `assets/js/main.js` — слайдер карточек, фотогалерея, модальные окна и форма.
- `send-form.php` — отправка формы на почту.
- `.htaccess` — HTTPS, домен без `www`, кэширование и заголовки безопасности.
- `robots.txt`, `sitemap.xml`, `404.html` — базовое SEO.

## Как открыть локально

Простой HTML можно открыть двойным кликом по `index.html`, но абсолютные пути `/assets/...` удобнее проверять через локальный сервер.

В терминале VS Code из папки проекта:

```powershell
python -m http.server 8000
```

Откройте `http://localhost:8000`.

Форма локально не отправится, потому что `python -m http.server` не запускает PHP. Форма заработает после загрузки на Beget.

## Где менять объекты и фотографии

Откройте `assets/js/projects.js`.

Каждый объект выглядит так:

```js
{
  id: 'unique-id',
  category: 'commercial', // commercial или private
  title: 'Название объекта',
  preview: '/assets/images/projects/example/01.webp',
  images: [
    '/assets/images/projects/example/01.webp',
    '/assets/images/projects/example/02.webp'
  ]
}
```

Карточка на главной показывает только `preview` и `title`. После нажатия открывается галерея из массива `images`.

## Как заменить фотографии

1. Создайте папку в `assets/images/projects/`, например `new-object`.
2. Положите туда оптимизированные изображения WebP.
3. Добавьте объект в `assets/js/projects.js`.
4. Рекомендуемый размер: до 1800 px по длинной стороне, качество WebP 80–85%.

## Настройка формы

В `send-form.php` проверьте:

```php
$recipient = 'elkoms2022@mail.ru';
```

После создания почтового ящика на домене замените адрес отправителя `no-reply@elkoms2022.ru` на существующий ящик. Отправка через `mail()` зависит от настроек хостинга; после загрузки обязательно отправьте тестовую заявку.

## Перед публикацией

1. Замените текст политики конфиденциальности на документ с реквизитами владельца сайта.
2. Проверьте адрес, телефоны, email и стаж компании.
3. Создайте счётчик Яндекс Метрики и вставьте его код в конец `index.html`.
4. В Яндекс Вебмастере добавьте домен и отправьте `sitemap.xml`.
5. На Beget выпустите SSL-сертификат для `elkoms2022.ru` и `www.elkoms2022.ru`.
6. Загрузите **содержимое этой папки** в `elkoms2022.ru/public_html/`.

Правильный результат на хостинге:

```text
public_html/
├── index.html
├── send-form.php
├── .htaccess
├── assets/
├── robots.txt
├── sitemap.xml
└── 404.html
```
