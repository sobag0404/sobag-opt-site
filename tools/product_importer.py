#!/usr/bin/env python3
"""Sobag local product importer.

Reads a CSV/XLSX table where one row is one base SKU/print, matches local photo
folders by base SKU, copies photos into a site-friendly structure, and writes a
products JSON file that follows the current frontend product shape.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


TEMPLATE_COLUMNS = [
    "Основной артикул",
    "Название",
    "Категория",
    "Типы товара",
    "Размеры",
    "Материалы",
    "Базовая цена",
    "Подборки",
    "Праздники",
    "Теги",
    "Краткое описание",
    "Описание в карточке",
    "Статус",
    "Популярность",
    "Папка фото",
    "Главное фото",
    "Фото галереи",
]

SAMPLE_ROW = [
    "10345",
    "Подушка Aurora Cats",
    "Подушки",
    "Подушка; Наволочка",
    "30x30; 35x35; 40x40; 45x45; 50x50",
    "Велюр; Габардин",
    "210",
    "Аниме; Животные",
    "Новый год",
    "аниме; коты; подарок",
    "Готовая позиция с одним принтом и вариантами комплектации.",
    "Описание для карточки товара: материалы, уход, упаковка, сроки.",
    "made",
    "80",
    "10345",
    "",
    "",
]

COLUMN_ALIASES = {
    "baseSku": ["Основной артикул", "Начальный артикул", "Артикул", "baseSku"],
    "name": ["Название", "Наименование", "name"],
    "category": ["Категория", "category"],
    "types": ["Типы товара", "Тип товара", "types"],
    "sizes": ["Размеры", "Размер", "sizes"],
    "materials": ["Материалы", "Материал", "materials"],
    "basePrice": ["Базовая цена", "Цена", "basePrice"],
    "collections": ["Подборки", "Коллекции", "collections"],
    "theme": ["Основная подборка", "theme"],
    "holidays": ["Праздники", "holidays"],
    "tags": ["Теги", "tags"],
    "description": ["Краткое описание", "Описание", "description"],
    "detailDescription": ["Описание в карточке", "Подробное описание", "detailDescription"],
    "stock": ["Статус", "stock"],
    "popular": ["Популярность", "popular"],
    "photoFolder": ["Папка фото", "photoFolder"],
    "image": ["Главное фото", "URL фото", "image"],
    "gallery": ["Фото галереи", "Галерея", "gallery"],
    "badge": ["Бейдж", "badge"],
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def split_list(value: str) -> list[str]:
    prepared = str(value or "")
    delimiter = ";" if ";" in prepared else ","
    return [item.strip() for item in prepared.split(delimiter) if item.strip()]


def clean_number(value: str, fallback: int) -> int:
    value = str(value or "").strip().replace(" ", "").replace(",", ".")
    try:
        return int(float(value))
    except ValueError:
        return fallback


def row_value(row: dict[str, str], key: str, fallback: str = "") -> str:
    for label in COLUMN_ALIASES[key]:
        if label in row and str(row[label]).strip():
            return str(row[label]).strip()
    return fallback


def normalize_match_key(value: str) -> str:
    return re.sub(r"[^0-9A-ZА-ЯЁ]+", "", str(value or "").upper())


def slug(value: str) -> str:
    ascii_part = re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")
    if ascii_part:
        return ascii_part
    return hashlib.sha1(str(value).encode("utf-8")).hexdigest()[:12]


def path_for_json(path: Path, project_root: Path) -> str:
    try:
        return path.resolve().relative_to(project_root.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        sample = file.read(4096)
        file.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters=",;")
        return list(csv.DictReader(file, dialect=dialect))


def cell_column_index(ref: str) -> int:
    letters = "".join(ch for ch in ref if ch.isalpha())
    result = 0
    for ch in letters:
        result = result * 26 + (ord(ch.upper()) - ord("A") + 1)
    return result - 1


def read_xlsx(path: Path) -> list[dict[str, str]]:
    ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with zipfile.ZipFile(path) as book:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in book.namelist():
            root = ET.fromstring(book.read("xl/sharedStrings.xml"))
            for item in root.findall("a:si", ns):
                shared_strings.append("".join(text.text or "" for text in item.findall(".//a:t", ns)))

        sheet_names = [name for name in book.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")]
        if not sheet_names:
            return []
        sheet = ET.fromstring(book.read(sheet_names[0]))

    rows: list[list[str]] = []
    for row in sheet.findall(".//a:sheetData/a:row", ns):
        values: list[str] = []
        for cell in row.findall("a:c", ns):
            index = cell_column_index(cell.attrib.get("r", "A1"))
            while len(values) <= index:
                values.append("")
            cell_type = cell.attrib.get("t")
            if cell_type == "inlineStr":
                value = "".join(text.text or "" for text in cell.findall(".//a:t", ns))
            else:
                raw = cell.find("a:v", ns)
                value = raw.text if raw is not None else ""
                if cell_type == "s" and value:
                    value = shared_strings[int(value)]
            values[index] = value or ""
        rows.append(values)

    if not rows:
        return []
    headers = [header.strip() for header in rows[0]]
    return [dict(zip(headers, row + [""] * (len(headers) - len(row)))) for row in rows[1:] if any(str(cell).strip() for cell in row)]


def read_table(path: Path) -> list[dict[str, str]]:
    if path.suffix.lower() == ".csv":
        return read_csv(path)
    if path.suffix.lower() == ".xlsx":
        return read_xlsx(path)
    raise ValueError("Поддерживаются только .csv и .xlsx")


def find_photo_folder(photos_root: Path, folder_value: str) -> Path | None:
    if not photos_root.exists():
        return None
    exact = photos_root / folder_value
    if exact.is_dir():
        return exact
    wanted = normalize_match_key(folder_value)
    for child in photos_root.rglob("*"):
        if not child.is_dir():
            continue
        if normalize_match_key(child.name) == wanted:
            return child
        try:
            relative = child.relative_to(photos_root).as_posix()
        except ValueError:
            relative = child.name
        if normalize_match_key(relative) == wanted:
            return child
    return None


def image_sort_key(path: Path) -> tuple[int, int | str]:
    stem = path.stem.strip()
    return (0, int(stem)) if stem.isdigit() else (1, stem.lower())


def copy_photos(base_sku: str, photo_folder: Path | None, assets_dir: Path, project_root: Path) -> tuple[list[str], list[str]]:
    if not photo_folder:
        return [], ["Папка фото не найдена"]
    images = sorted(
        [path for path in photo_folder.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS],
        key=image_sort_key,
    )
    if not images:
        return [], ["В папке нет фото jpg/jpeg/png/webp"]

    destination = assets_dir / slug(base_sku)
    destination.mkdir(parents=True, exist_ok=True)
    copied: list[str] = []
    for index, source in enumerate(images, start=1):
        target = destination / f"{index}{source.suffix.lower()}"
        shutil.copy2(source, target)
        copied.append(path_for_json(target, project_root))
    return copied, []


def make_product(row: dict[str, str], photos_root: Path, assets_dir: Path, project_root: Path) -> tuple[dict, dict]:
    base_sku = row_value(row, "baseSku").upper()
    photo_folder_name = row_value(row, "photoFolder", base_sku)
    folder = find_photo_folder(photos_root, photo_folder_name)
    copied_images, warnings = copy_photos(base_sku, folder, assets_dir, project_root)
    gallery_from_table = split_list(row_value(row, "gallery"))
    collections = split_list(row_value(row, "collections") or row_value(row, "theme"))
    main_image = copied_images[0] if copied_images else row_value(row, "image") or "assets/production-workshop-1.png"

    product = {
        "id": f"{slug(base_sku)}-{hashlib.sha1(base_sku.encode('utf-8')).hexdigest()[:6]}",
        "baseSku": base_sku,
        "name": row_value(row, "name"),
        "category": row_value(row, "category", "Подушки"),
        "theme": row_value(row, "theme") or (collections[0] if collections else ""),
        "collections": collections,
        "holidays": split_list(row_value(row, "holidays")),
        "tags": split_list(row_value(row, "tags")),
        "types": split_list(row_value(row, "types", "Подушка; Наволочка")),
        "sizes": split_list(row_value(row, "sizes", "40x40")),
        "materials": split_list(row_value(row, "materials", "Велюр; Габардин")),
        "basePrice": clean_number(row_value(row, "basePrice"), 220),
        "image": main_image,
        "gallery": copied_images[1:] if copied_images else gallery_from_table,
        "photoFolder": photo_folder_name,
        "stock": row_value(row, "stock", "made"),
        "badge": row_value(row, "badge"),
        "description": row_value(row, "description"),
        "detailDescription": row_value(row, "detailDescription"),
        "popular": clean_number(row_value(row, "popular"), 50),
    }
    report = {
        "baseSku": base_sku,
        "name": product["name"],
        "photoFolder": photo_folder_name,
        "photoCount": str(len(copied_images)),
        "mainImage": main_image,
        "warnings": "; ".join(warnings),
    }
    return product, report


def write_report(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["baseSku", "name", "photoFolder", "photoCount", "mainImage", "warnings"])
        writer.writeheader()
        writer.writerows(rows)


def write_csv_rows(path: Path, rows: list[list[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file)
        writer.writerows(rows)


def xml_escape(value: str) -> str:
    return str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def column_name(index: int) -> str:
    name = ""
    index += 1
    while index:
        index, rem = divmod(index - 1, 26)
        name = chr(65 + rem) + name
    return name


def write_xlsx_rows(path: Path, rows: list[list[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet_rows = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for col_index, value in enumerate(row):
            ref = f"{column_name(col_index)}{row_index}"
            cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{xml_escape(value)}</t></is></c>')
        sheet_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')

    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<dimension ref="A1:{column_name(len(TEMPLATE_COLUMNS) - 1)}{len(rows)}"/>'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        "</worksheet>"
    )
    files = {
        "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Товары" sheetId="1" r:id="rId1"/></sheets></workbook>',
        "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        "xl/worksheets/sheet1.xml": sheet_xml,
    }
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as book:
        for name, content in files.items():
            book.writestr(name, content)


def command_template(args: argparse.Namespace) -> None:
    out_dir = Path(args.out)
    rows = [TEMPLATE_COLUMNS, SAMPLE_ROW]
    write_csv_rows(out_dir / "sobag-products-template.csv", rows)
    write_xlsx_rows(out_dir / "sobag-products-template.xlsx", rows)
    print(f"Templates written to {out_dir}")


def folder_image_count(folder: Path) -> int:
    return sum(1 for path in folder.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)


def folder_has_child_dirs(folder: Path) -> bool:
    return any(path.is_dir() for path in folder.iterdir())


def iter_product_photo_folders(photos_root: Path, include_empty: bool) -> list[Path]:
    folders: list[Path] = []
    for folder in photos_root.rglob("*"):
        if not folder.is_dir():
            continue
        image_count = folder_image_count(folder)
        if image_count > 0 or (include_empty and not folder_has_child_dirs(folder)):
            folders.append(folder)
    return sorted(folders, key=lambda path: path.relative_to(photos_root).as_posix().lower())


def category_from_folder(photos_root: Path, folder: Path, fallback: str) -> str:
    try:
        relative = folder.relative_to(photos_root)
    except ValueError:
        return fallback
    if len(relative.parts) >= 2:
        return folder.parent.name
    return fallback


def relative_folder_value(photos_root: Path, folder: Path) -> str:
    try:
        return folder.relative_to(photos_root).as_posix()
    except ValueError:
        return folder.name


def guess_base_sku(folder_name: str) -> str:
    starts_with_sku = re.match(r"^\s*([A-Za-zА-Яа-яЁё]+[-_\s]?\d+[A-Za-zА-Яа-яЁё0-9-]*)", folder_name)
    if starts_with_sku:
        return normalize_match_key(starts_with_sku.group(1))
    for token in re.split(r"[\s_()]+", folder_name):
        if re.search(r"\d", token):
            return normalize_match_key(token)
    return normalize_match_key(folder_name)


def command_scan_photos(args: argparse.Namespace) -> None:
    photos_root = Path(args.photos).resolve()
    requested_path = Path(args.out)
    csv_path = requested_path if requested_path.suffix.lower() == ".csv" else requested_path.with_suffix(".csv")
    xlsx_path = requested_path if requested_path.suffix.lower() == ".xlsx" else requested_path.with_suffix(".xlsx")
    report_path = Path(args.report)
    rows = [TEMPLATE_COLUMNS]
    report_rows: list[dict[str, str]] = []

    for folder in iter_product_photo_folders(photos_root, args.include_empty):
        count = folder_image_count(folder)
        if count == 0 and not args.include_empty:
            continue
        base_sku = guess_base_sku(folder.name)
        category = category_from_folder(photos_root, folder, args.category)
        relative_folder = relative_folder_value(photos_root, folder)
        rows.append(
            [
                base_sku,
                f"Товар {base_sku}",
                category,
                args.types,
                args.sizes,
                args.materials,
                args.base_price,
                "",
                "",
                "",
                "",
                "",
                "made",
                "50",
                relative_folder,
                "",
                "",
            ]
        )
        report_rows.append(
            {
                "baseSku": base_sku,
                "name": f"Товар {base_sku}",
                "photoFolder": relative_folder,
                "photoCount": str(count),
                "mainImage": "",
                "warnings": "" if count else "В папке нет фото",
            }
        )

    write_csv_rows(csv_path, rows)
    write_xlsx_rows(xlsx_path, rows)
    write_report(report_path, report_rows)
    print(
        json.dumps(
            {"folders": len(rows) - 1, "csv": str(csv_path), "xlsx": str(xlsx_path), "report": str(report_path)},
            ensure_ascii=False,
            indent=2,
        )
    )


def command_import(args: argparse.Namespace) -> None:
    project_root = Path(args.project_root).resolve()
    table = Path(args.table).resolve()
    photos_root = Path(args.photos).resolve()
    assets_dir = (project_root / args.assets).resolve()
    output = (project_root / args.out).resolve()
    report_path = (project_root / args.report).resolve()

    rows = read_table(table)
    products: list[dict] = []
    report_rows: list[dict[str, str]] = []
    for row in rows:
        if not row_value(row, "baseSku") or not row_value(row, "name"):
            continue
        product, report = make_product(row, photos_root, assets_dir, project_root)
        products.append(product)
        report_rows.append(report)

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    write_report(report_path, report_rows)
    print(json.dumps({"products": len(products), "output": str(output), "report": str(report_path)}, ensure_ascii=False, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser(description="Sobag product import helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    template_parser = subparsers.add_parser("template", help="write CSV/XLSX product templates")
    template_parser.add_argument("--out", default="templates", help="template output directory")
    template_parser.set_defaults(func=command_template)

    scan_parser = subparsers.add_parser("scan-photos", help="make a prefilled template from photo folder names")
    scan_parser.add_argument("--photos", required=True, help="root folder with product photo folders")
    scan_parser.add_argument("--out", default="local-import-output/products-from-photo-folders.csv", help="prefilled CSV path")
    scan_parser.add_argument("--report", default="local-import-output/photo-folder-report.csv", help="photo folder report path")
    scan_parser.add_argument("--category", default="Подушки", help="default category for generated rows")
    scan_parser.add_argument("--types", default="", help="default product types separated by ;")
    scan_parser.add_argument("--sizes", default="", help="default sizes separated by ;")
    scan_parser.add_argument("--materials", default="", help="default materials separated by ;")
    scan_parser.add_argument("--base-price", default="220", help="default base price")
    scan_parser.add_argument("--include-empty", action="store_true", help="include folders without images")
    scan_parser.set_defaults(func=command_scan_photos)

    import_parser = subparsers.add_parser("import", help="import products from CSV/XLSX and local photo folders")
    import_parser.add_argument("--table", required=True, help="CSV/XLSX table path")
    import_parser.add_argument("--photos", required=True, help="root folder with product photo folders")
    import_parser.add_argument("--project-root", default=".", help="site project root")
    import_parser.add_argument("--assets", default="assets/imported-products", help="where copied photos are placed")
    import_parser.add_argument("--out", default="data/products.import.json", help="products JSON output path")
    import_parser.add_argument("--report", default="data/import-report.csv", help="CSV report output path")
    import_parser.set_defaults(func=command_import)

    args = parser.parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
