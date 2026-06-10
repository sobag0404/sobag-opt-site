# Final Content Packet

Last updated: 2026-06-10

Цель: собрать реальные финальные контакты, юридические данные и адреса для Sobag Opt так, чтобы их можно было проверить до публикации и не выдумывать реквизиты или карты.

## Где Готовить

Файл с реальными данными держать локально и не коммитить:

```text
local-import-output/final-content-packet.json
```

`local-import-output/` уже игнорируется Git. Не добавлять в репозиторий документы с ИНН, договорами, сканами, токенами, доступами или приватными контактами.

## Минимальная Структура

```json
{
  "companyName": "ООО или ИП ...",
  "footerEmail": "opt@example.ru",
  "footerPhone": "+7 999 999-99-99",
  "footerAddress": "Краткий адрес отгрузки",
  "contactsLegalAddress": "Полный юридический адрес",
  "contactsProductionAddress": "Полный адрес производства или самовывоза",
  "contactsSchedule": "Пн-Пт, 10:00-18:00",
  "contactsLegalMapUrl": "https://yandex.ru/maps/?text=...",
  "contactsProductionMapUrl": "https://yandex.ru/maps/?text=..."
}
```

## Проверка

```powershell
npm.cmd run audit:final-content-packet -- --packet local-import-output/final-content-packet.json --strict
```

Без `--strict` команда может использоваться как readiness report и не падает, если пакет еще не создан.

## Правила

- Телефон должен быть в международном формате, например `+7 999 999-99-99`.
- Email должен быть рабочим доменным адресом, не старым `sobag-shop.ru`.
- Адреса не должны содержать слова `по запросу`, `согласуется`, `уточняется`, `будет указан`.
- Яндекс-карты добавлять только для реальных подтвержденных адресов.
- Если адреса еще нет, лучше оставить публичный сайт без карты, чем показывать заглушку.
- После применения финального пакета запустить `npm.cmd run audit:content-readiness` и `npm.cmd run check`.
