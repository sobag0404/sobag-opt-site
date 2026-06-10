# CWV Field Audit Packet

Last updated: 2026-06-10

Цель: после реального роста каталога и миграции фото зафиксировать Core Web Vitals аудит так, чтобы проект не отмечал performance done по синтетическим данным.

## Где Готовить

Локальный файл, не коммитить:

```text
local-import-output/cwv-field-audit-packet.json
```

## Структура

```json
{
  "baseUrl": "https://sobag-shop.online",
  "catalogProducts": 10000,
  "imageMigrationReady": true,
  "measuredAt": "2026-06-10T12:00:00.000Z",
  "tool": "Lighthouse/PageSpeed/WebPageTest/manual",
  "pages": [
    {
      "path": "/catalog",
      "lcpMs": 2400,
      "cls": 0.05,
      "inpMs": 180,
      "tbtMs": 180,
      "transferKb": 900,
      "firstPageApiKb": 180,
      "usesWebpOrAvif": true
    }
  ]
}
```

## Проверка

```powershell
npm.cmd run audit:cwv-field -- --packet local-import-output/cwv-field-audit-packet.json --strict
```

Без `--strict` команда работает как readiness report и не падает, если пакет еще не создан.

## Минимум

Пакет должен покрывать:

- `/`
- `/catalog`
- `/catalog?category=Подушки`
- `/search?q=подушка`
- `/cart`
- один product modal или detail state из большой категории

Порог для pass:

- LCP <= 2500 ms;
- CLS <= 0.1;
- INP <= 200 ms или TBT <= 300 ms, если INP недоступен;
- first-page API payload <= 220 KB;
- WebP/AVIF используется на страницах с товарами.
