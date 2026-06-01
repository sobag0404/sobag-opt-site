#!/usr/bin/env python3
"""Prepare imported products for the static preview catalog.

This converts local imported images to smaller WebP files and rewrites product
image paths into data/products-live.json, which the static site can fetch.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image


FLAG_CATEGORY = "Флаги"


def convert_image(source: Path, target: Path, max_size: int, quality: int) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((max_size, max_size), Image.LANCZOS)
        image.save(target, "WEBP", quality=quality, method=6)


def rewrite_image(path_value: str, source_root: Path, target_root: Path, project_root: Path, max_size: int, quality: int) -> str:
    source = project_root / path_value
    if not source.exists():
        return path_value
    try:
        relative = source.relative_to(source_root)
    except ValueError:
        return path_value
    target = target_root / relative.with_suffix(".webp")
    convert_image(source, target, max_size, quality)
    return target.relative_to(project_root).as_posix()


def image_order_key(path_value: str, descending: bool) -> tuple[int, int | str]:
    stem = Path(path_value).stem.strip()
    if stem.isdigit():
        number = int(stem)
        return (0, -number if descending else number)
    return (1, stem.lower())


def is_flag_product(product: dict) -> bool:
    categories = product.get("categories") or [product.get("category", "")]
    return any("флаг" in str(category).strip().casefold() for category in categories)


def order_product_images(product: dict) -> None:
    images = [product.get("image"), *(product.get("gallery") or [])]
    ordered = sorted(
        [image for image in images if image],
        key=lambda image: image_order_key(image, descending=not is_flag_product(product)),
    )
    if not ordered:
        return
    product["image"] = ordered[0]
    product["gallery"] = ordered[1:]


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish imported Sobag products as optimized static preview data")
    parser.add_argument("--input", default="data/products.import.json", help="imported products JSON")
    parser.add_argument("--out", default="data/products-live.json", help="published products JSON")
    parser.add_argument("--source-assets", default="assets/imported-products", help="source imported image folder")
    parser.add_argument("--target-assets", default="assets/product-preview", help="optimized image folder")
    parser.add_argument("--max-size", type=int, default=1200, help="max image side in pixels")
    parser.add_argument("--quality", type=int, default=78, help="WebP quality")
    args = parser.parse_args()

    project_root = Path.cwd()
    input_path = project_root / args.input
    output_path = project_root / args.out
    source_root = project_root / args.source_assets
    target_root = project_root / args.target_assets

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    temp_target_root = target_root.with_name(f"{target_root.name}.__tmp__")
    backup_target_root = target_root.with_name(f"{target_root.name}.__backup__")
    if temp_target_root.exists():
        shutil.rmtree(temp_target_root)
    temp_target_root.mkdir(parents=True, exist_ok=True)

    products = json.loads(input_path.read_text(encoding="utf-8"))
    image_count = 0
    for product in products:
        if product.get("image"):
            product["image"] = rewrite_image(product["image"], source_root, temp_target_root, project_root, args.max_size, args.quality)
            image_count += 1
        gallery = []
        for image in product.get("gallery", []):
            gallery.append(rewrite_image(image, source_root, temp_target_root, project_root, args.max_size, args.quality))
            image_count += 1
        product["gallery"] = gallery
        order_product_images(product)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if backup_target_root.exists():
        shutil.rmtree(backup_target_root)
    if target_root.exists():
        target_root.rename(backup_target_root)
    temp_target_root.rename(target_root)
    if backup_target_root.exists():
        shutil.rmtree(backup_target_root)
    output_path.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"products": len(products), "images": image_count, "output": str(output_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
