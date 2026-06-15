use super::*;

#[test]
fn cursor_roundtrip() {
    assert_eq!(decode_cursor(&encode_cursor(96)), Some(96));
    assert_eq!(decode_cursor("bad"), None);
}

#[test]
fn parses_query_like_node() {
    let query = parse_catalog_query("q=%D0%9F%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B0&pageSize=999&page=3&category=%D0%9F%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B8&categories=%D0%9D%D0%B0%D0%B2%D0%BE%D0%BB%D0%BE%D1%87%D0%BA%D0%B8&sort=price_asc");
    assert_eq!(query.q, "Подушка");
    assert_eq!(query.page_size, MAX_PAGE_SIZE);
    assert_eq!(query.offset, 240);
    assert_eq!(query.filters.get("category").unwrap().len(), 2);
    assert_eq!(query.sort, "price_asc");
}
