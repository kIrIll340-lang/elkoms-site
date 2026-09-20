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
    └── images/
```

## Local Development

Run a simple local HTTP server from the project directory:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

The PHP contact form requires a PHP-enabled web server and will not work through Python's static HTTP server.

## Project Status

Completed and deployed to production.

This repository is published as part of my development portfolio.
