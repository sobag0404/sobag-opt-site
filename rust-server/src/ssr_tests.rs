use super::*;
use std::path::PathBuf;

#[test]
fn renders_catalog_fragment_as_htmx_safe_html() {
    let query = parse_catalog_query("q=pod&pageSize=1&sort=popular");
    let page = ListingPage {
        total: 2,
        facet_options: HashMap::from([(
            "categories",
            vec![FacetValue {
                value: "Pillows".to_string(),
                count: 2,
            }],
        )]),
        items: vec![CatalogCard {
            id: "p1".to_string(),
            base_sku: "opt_1".to_string(),
            name: "Pillow <test>".to_string(),
            category: "Pillows".to_string(),
            categories: vec!["Pillows".to_string()],
            collections: vec![],
            holidays: vec![],
            tags: vec![],
            badge: String::new(),
            description: String::new(),
            stock: "in_stock".to_string(),
            image: "/img.jpg".to_string(),
            image_meta: None,
            min_price: 220,
            max_price: 220,
            variant_count: 1,
            popular: 1,
        }],
    };
    let html = render_listing_fragment("/rust/catalog-fragment", &query, &page);
    assert!(html.contains("hx-get"));
    assert!(html.contains("opt_1"));
    assert!(html.contains("data-copy-sku=\"opt_1\""));
    assert!(html.contains("Pillow &lt;test&gt;"));
    assert!(!html.contains("<test>"));
}

#[test]
fn renders_product_fragment_with_variants() {
    let product = ProductDetail {
        id: "p1".to_string(),
        base_sku: "opt_1".to_string(),
        name: "Pillow".to_string(),
        status: "published".to_string(),
        hidden: false,
        category: "Pillows".to_string(),
        categories: vec!["Pillows".to_string()],
        collections: vec![],
        holidays: vec![],
        tags: vec![],
        description: "Description".to_string(),
        detail_description: String::new(),
        base_price: 0,
        min_price: 220,
        max_price: 220,
        popular: 1,
        stock: "in_stock".to_string(),
        variants: vec![Variant {
            id: "v1".to_string(),
            product_id: "p1".to_string(),
            base_sku: "opt_1".to_string(),
            sku: "sku_1".to_string(),
            variant_type: "Pillow".to_string(),
            size: "40x40".to_string(),
            material: "Velour".to_string(),
            name: String::new(),
            price: 220,
            price_source: String::new(),
        }],
        images: vec![],
    };
    let html = render_product_fragment(&product, &[]);
    assert!(html.contains("sku_1"));
    assert!(html.contains("от 220 ₽"));
    assert!(html.contains("assets/production-hero-1.png"));
    assert!(html.contains("rust-variant-qty"));
    assert!(html.contains("class=\"rust-copy-sku\""));
    assert!(html.contains("data-copy-sku=\"opt_1\""));
    assert!(html.contains("Скопировать артикул"));
}

#[test]
fn renders_content_page_from_admin_content_shape() {
    let content = json!({
        "aboutPageTitle": "About <Sobag>",
        "aboutPageLead": "Lead",
        "aboutPageText": "Text",
        "aboutPageProductionTitle": "Production",
        "aboutPageProductionText": "Details"
    });
    let html = render_content_page(content_page_spec("about").unwrap(), &content);
    assert!(html.contains("data-rust-content-page=\"about\""));
    assert!(html.contains("About &lt;Sobag&gt;"));
    assert!(html.contains("Production"));
    assert!(!html.contains("About <Sobag>"));
}

#[test]
fn renders_contacts_page_with_maps_and_normalized_addresses() {
    let content = json!({
        "contactsLegalAddress": "431815, Республика Мордовия, Атяшевский р-н, село Наборные Сыреси, ул. Крупской, д. 18",
        "contactsProductionAddress": "г. Курск, ул. Литовская, д. 12"
    });
    let html = render_content_page(content_page_spec("contacts").unwrap(), &content);
    assert!(html.contains("contacts-maps"));
    assert!(html.contains("<iframe"));
    assert!(html.contains("305014, Курская область, г. Курск, ул. Литовская, д. 12"));
    assert!(html.contains("431815, Республика Мордовия, Атяшевский район, с. Наборные Сыреси"));
    assert!(html.contains("https://yandex.ru/map-widget/v1/"));
    assert!(html.contains("Открыть на карте"));
}

#[test]
fn renders_marketplace_cards_as_external_links() {
    let html = render_content_page(content_page_spec("marketplaces").unwrap(), &Value::Null);
    assert!(html.contains("https://www.wildberries.ru/seller/167187"));
    assert!(html.contains("https://ozon.ru/s/sobag"));
    assert!(html.contains("https://market.yandex.ru/cc/84GXiW"));
    assert!(html.contains("target=\"_blank\""));
    assert!(html.contains("rel=\"noopener noreferrer\""));
    assert!(html.contains("marketplace-card"));
}

#[test]
fn renders_preview_shell_with_compact_account_icon() {
    let html = render_preview_shell_header(&RUST_ROUTES);
    assert!(html.contains("rust-shell-account"));
    assert!(html.contains("aria-label=\"Войти или зарегистрироваться\""));
    assert!(html.contains("title=\"Войти или зарегистрироваться\""));
    assert!(!html.contains(">Вход</a>"));
}

#[test]
fn file_store_content_key_matches_node_contract() {
    assert_eq!(
        file_key_hex("sobag:content:v1"),
        "736f6261673a636f6e74656e743a7631"
    );
    assert_eq!(
        file_store_path_for_key(".sobag-store", CONTENT_KEY),
        PathBuf::from(".sobag-store").join("736f6261673a636f6e74656e743a7631.json")
    );
    assert_eq!(
        file_store_path_for_key(".sobag-store", STORE_KEY),
        PathBuf::from(".sobag-store").join("736f6261673a73746f72653a7631.json")
    );
}

#[test]
fn auth_session_cookie_contract_matches_node() {
    let token = "abc123";
    assert_eq!(SESSION_COOKIE, "sobag_session");
    assert_eq!(SESSION_TTL_SECONDS, 2_592_000);
    assert_eq!(session_store_key(token), "sobag:session:abc123");
    assert!(session_cookie_header(token).contains("HttpOnly"));
    assert!(session_cookie_header(token).contains("SameSite=Lax"));
    assert!(expired_session_cookie_header().contains("Max-Age=0"));
    assert_eq!(
        parse_cookie_value("theme=dark; sobag_session=abc123; other=1", SESSION_COOKIE),
        Some("abc123".to_string())
    );
    assert_eq!(
        parse_cookie_value("sobag_session=token%20value", SESSION_COOKIE),
        Some("token value".to_string())
    );
    assert_eq!(parse_cookie_value("other=1", SESSION_COOKIE), None);
}

#[test]
fn auth_cookie_mutation_requires_same_origin_outside_local_dev() {
    let mut headers = HeaderMap::new();
    headers.insert(header::HOST, "sobag-shop.online".parse().unwrap());
    headers.insert(header::COOKIE, "sobag_session=abc".parse().unwrap());
    assert!(matches!(
        enforce_auth_same_origin_for_cookie_mutation(&headers),
        Err(AppError {
            status: StatusCode::FORBIDDEN,
            code: "csrf_origin_forbidden",
            ..
        })
    ));
    headers.insert(header::ORIGIN, "https://sobag-shop.online".parse().unwrap());
    assert!(enforce_auth_same_origin_for_cookie_mutation(&headers).is_ok());
}

#[test]
fn auth_rate_limit_matches_node_style_bucket_guard() {
    let mut headers = HeaderMap::new();
    headers.insert("x-real-ip", "203.0.113.10".parse().unwrap());
    let key = format!(
        "auth:test:{}",
        Utc::now().timestamp_nanos_opt().unwrap_or_default()
    );
    assert!(auth_rate_limit(&headers, &key, 1, 60).is_ok());
    assert!(matches!(
        auth_rate_limit(&headers, &key, 1, 60),
        Err(AppError {
            status: StatusCode::TOO_MANY_REQUESTS,
            code: "rate_limited",
            ..
        })
    ));
}

#[test]
fn finds_login_user_by_email_or_phone_and_hashes_preview_password() {
    let (password_hash, password_salt) = hash_password_preview("secret123", "buyer@example.test");
    let store = json!({
        "users": {
            "buyer@example.test": {
                "email": "buyer@example.test",
                "phone": "+7 968 959-32-54",
                "passwordHash": password_hash,
                "passwordSalt": password_salt
            }
        }
    });
    let by_email = find_login_user(&store, "BUYER@example.test").expect("email login");
    assert_eq!(by_email.0, "buyer@example.test");
    let by_phone = find_login_user(&store, "89689593254").expect("phone login");
    assert_eq!(by_phone.0, "buyer@example.test");
    assert!(verify_user_password("secret123", &by_email.1));
    assert!(!verify_user_password("wrong", &by_email.1));
}

#[test]
fn preview_session_tokens_are_random_hex_values() {
    let first = preview_session_token("buyer@example.test").expect("first token");
    let second = preview_session_token("buyer@example.test").expect("second token");
    assert_eq!(first.len(), 64);
    assert_eq!(second.len(), 64);
    assert!(first.chars().all(|item| item.is_ascii_hexdigit()));
    assert_ne!(first, second);
    assert!(!first.contains("buyer"));
}

#[test]
fn sanitizes_profile_preview_fields() {
    let profile = json!({
        "name": " Buyer ",
        "phone": "89689593254",
        "inn": "123abc456789012",
        "kpp": "12x3456789"
    });
    let sanitized = sanitize_profile_value(&profile, &json!({}));
    assert_eq!(sanitized["name"], "Buyer");
    assert_eq!(sanitized["phone"], "+7 968 959-32-54");
    assert_eq!(sanitized["inn"], "123456789012");
    assert_eq!(sanitized["kpp"], "123456789");
}

#[test]
fn file_store_wrapper_unwraps_and_expires_like_node() {
    let wrapped = json!({
        "version": 1,
        "expiresAt": "2030-01-01T00:00:00.000Z",
        "value": { "email": "buyer@example.test" }
    });
    assert_eq!(
        file_store_unwrap_value(&wrapped, 1_700_000_000),
        Some(json!({ "email": "buyer@example.test" }))
    );

    let expired = json!({
        "version": 1,
        "expiresAt": "2020-01-01T00:00:00.000Z",
        "value": { "email": "buyer@example.test" }
    });
    assert_eq!(file_store_unwrap_value(&expired, 1_700_000_000), None);
    assert_eq!(
        file_store_unwrap_value(&json!({"raw": true}), 1),
        Some(json!({"raw": true}))
    );
}

#[test]
fn store_provider_defaults_to_redis_with_file_aliases() {
    assert_eq!(normalized_store_provider(None), StoreProvider::Redis);
    assert_eq!(normalized_store_provider(Some("")), StoreProvider::Redis);
    assert_eq!(
        normalized_store_provider(Some("redis")),
        StoreProvider::Redis
    );
    assert_eq!(normalized_store_provider(Some("file")), StoreProvider::File);
    assert_eq!(
        normalized_store_provider(Some("filesystem")),
        StoreProvider::File
    );
    assert_eq!(normalized_store_provider(Some("fs")), StoreProvider::File);
}

#[test]
fn redis_config_ignores_empty_primary_env_aliases() {
    assert_eq!(
        first_non_empty_value(Some(""), Some("https://redis.example.test/")),
        "https://redis.example.test/"
    );
    assert_eq!(
        first_non_empty_value(
            Some("  https://kv.example.test  "),
            Some("https://redis.example.test")
        ),
        "https://kv.example.test"
    );
    assert_eq!(first_non_empty_value(None, Some(" token ")), "token");
}

#[test]
fn redis_store_commands_match_upstash_rest_contract() {
    assert_eq!(
        redis_get_command(STORE_KEY).expect("get command"),
        json!(["GET", STORE_KEY])
    );
    assert_eq!(
        redis_del_command("sobag:session:abc").expect("del command"),
        json!(["DEL", "sobag:session:abc"])
    );
    assert_eq!(
        redis_set_command(
            "sobag:session:abc",
            &json!({"email": "buyer@example.test"}),
            Some(60)
        )
        .expect("set command"),
        json!([
            "SET",
            "sobag:session:abc",
            "{\"email\":\"buyer@example.test\"}",
            "EX",
            60
        ])
    );
    assert_eq!(
        redis_set_command(STORE_KEY, &json!({"orders": []}), None).expect("set command"),
        json!(["SET", STORE_KEY, "{\"orders\":[]}"])
    );
}

#[test]
fn redis_result_parses_node_serialized_values() {
    assert_eq!(redis_result_to_value(&Value::Null), None);
    assert_eq!(
        redis_result_to_value(&json!("{\"orders\":[],\"version\":1}")),
        Some(json!({"orders": [], "version": 1}))
    );
    assert_eq!(
        redis_result_to_value(&json!({"orders": [], "version": 1})),
        Some(json!({"orders": [], "version": 1}))
    );
}

#[test]
fn verifies_node_pbkdf2_password_fixture() {
    assert_eq!(PBKDF2_ITERATIONS, 310_000);
    assert_eq!(PBKDF2_KEY_LEN, 32);
    assert!(verify_password_hash(
        "Qwerty1234567899",
        "00112233445566778899aabbccddeeff",
        "1b827148ba2a5541c2b632bce36aba9b39449d7e8e366e82b18347854479f71a"
    ));
    assert!(!verify_password_hash(
        "wrong",
        "00112233445566778899aabbccddeeff",
        "1b827148ba2a5541c2b632bce36aba9b39449d7e8e366e82b18347854479f71a"
    ));
    assert!(!verify_password_hash("secret", "not-hex", "also-not-hex"));
}

#[test]
fn builds_auth_me_payload_without_private_fields() {
    let store = json!({
        "users": {
            "buyer@example.test": {
                "email": "buyer@example.test",
                "name": "Buyer",
                "role": "buyer",
                "passwordHash": "hidden",
                "passwordSalt": "hidden"
            }
        },
        "orders": [
            {
                "id": "SO-1",
                "userEmail": "buyer@example.test",
                "crmThread": [
                    { "visibility": "customer", "text": "visible" },
                    { "visibility": "internal", "text": "hidden" }
                ]
            },
            { "id": "SO-2", "customer": { "email": "other@example.test" } }
        ],
        "reviews": [
            { "id": "REV-1", "userEmail": "buyer@example.test", "text": "ok" }
        ],
        "carts": {
            "buyer@example.test": { "items": [{ "key": "sku-1" }] }
        },
        "favorites": {
            "buyer@example.test": { "items": ["p1"] }
        },
        "savedCarts": {
            "buyer@example.test": {
                "items": [{
                    "id": "SC-1",
                    "managerComment": "hidden",
                    "commentHistory": [
                        { "visibility": "customer", "text": "visible" },
                        { "visibility": "internal", "text": "hidden" }
                    ]
                }]
            }
        }
    });
    let payload = auth_me_payload_from_values(
        &store,
        &json!({ "email": "buyer@example.test", "createdAt": "2026-06-11T00:00:00.000Z" }),
    );
    assert_eq!(payload["user"]["email"], "buyer@example.test");
    assert!(payload["user"].get("passwordHash").is_none());
    assert!(payload["user"].get("passwordSalt").is_none());
    assert_eq!(payload["user"]["orders"].as_array().unwrap().len(), 1);
    assert_eq!(
        payload["user"]["orders"][0]["crmThread"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(payload["user"]["reviews"].as_array().unwrap().len(), 1);
    assert_eq!(payload["cartItems"].as_array().unwrap().len(), 1);
    assert_eq!(payload["favoriteItems"].as_array().unwrap().len(), 1);
    assert!(payload["savedCarts"][0].get("managerComment").is_none());
    assert_eq!(
        payload["savedCarts"][0]["commentHistory"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
}

#[test]
fn auth_me_payload_is_anonymous_without_session_user() {
    let payload = auth_me_payload_from_values(
        &json!({ "users": {} }),
        &json!({ "email": "missing@example.test" }),
    );
    assert_eq!(payload, json!({ "user": null }));
}

#[test]
fn sanitizes_auth_me_account_state_writes() {
    let cart = sanitize_cart_items(&json!([
        ["line-1", { "qty": 100000, "variant": { "sku": "sku-1", "price": -5 } }],
        { "key": "bad", "variant": {} }
    ]));
    assert_eq!(cart.as_array().unwrap().len(), 1);
    assert_eq!(cart[0][1]["qty"], 99999);
    assert_eq!(cart[0][1]["variant"]["price"], 0.0);

    let favorites = sanitize_favorite_items(&json!(["p1", "p1", "", "p2"]));
    assert_eq!(favorites, json!(["p1", "p2"]));

    let saved = sanitize_saved_carts_input(
        &json!([{
            "id": "SC-1",
            "items": [["line-1", { "variant": { "sku": "sku-1" } }]],
            "status": "sent",
            "managerComment": "hidden",
            "commentHistory": [
                { "visibility": "customer", "text": "visible" },
                { "visibility": "internal", "text": "hidden" }
            ]
        }]),
        false,
    );
    assert_eq!(saved[0]["status"], "sent");
    assert!(saved[0].get("managerComment").is_none());
    assert_eq!(saved[0]["commentHistory"].as_array().unwrap().len(), 1);

    let user = json!({ "email": "buyer@example.test", "name": "Buyer" });
    let review = sanitize_review_value(
        &json!({
            "productId": "p1",
            "baseSku": "opt_1",
            "productName": "Pillow",
            "rating": 7,
            "text": "great product"
        }),
        &user,
    )
    .expect("review");
    assert_eq!(review["rating"], 5);
    assert_eq!(review["status"], "pending");
}

#[test]
fn stores_auth_me_account_state_by_user_email() {
    let mut store = default_store_value();
    set_store_nested_items(&mut store, "favorites", "buyer@example.test", json!(["p1"]));
    assert_eq!(
        store_nested_items(&store, "favorites", "buyer@example.test"),
        json!(["p1"])
    );
    push_review_record(&mut store, json!({ "id": "REV-1" }));
    assert_eq!(store["reviews"].as_array().unwrap().len(), 1);
}

#[test]
fn admin_orders_payload_keeps_raw_order_data_for_managers() {
    let store = json!({
        "users": {
            "manager@example.test": { "email": "manager@example.test", "name": "Manager", "role": "manager" }
        },
        "orders": [
            {
                "id": "SO-1",
                "status": "new",
                "crmThread": [
                    { "visibility": "internal", "text": "manager-only" },
                    { "visibility": "customer", "text": "customer-visible" }
                ]
            }
        ]
    });
    let payload = admin_orders_payload_from_values(&store);
    assert_eq!(payload["orders"].as_array().unwrap().len(), 1);
    assert_eq!(
        payload["orders"][0]["crmThread"].as_array().unwrap().len(),
        2
    );
    assert!(can_read_admin_orders(&json!({ "role": "admin" })));
    assert!(can_read_admin_orders(&json!({ "role": "manager" })));
    assert!(!can_read_admin_orders(&json!({ "role": "buyer" })));
    let mut store = store;
    let updated = apply_admin_order_patch(
        &mut store,
        &json!({
            "id": "SO-1",
            "status": "processing",
            "managerEmail": "manager@example.test",
            "managerNote": "Call client",
            "commentText": "Visible update",
            "commentVisibility": "customer"
        }),
        &json!({ "email": "admin@example.test", "name": "Admin", "role": "admin" }),
    )
    .expect("order patch");
    assert_eq!(updated["status"], "processing");
    assert_eq!(updated["managerName"], "Manager");
    assert_eq!(updated["crmThread"][0]["visibility"], "customer");
    assert_eq!(updated["statusHistory"].as_array().unwrap().len(), 1);
    assert_eq!(store["audit"][0]["type"], "order_update");
    let invalid = apply_admin_order_patch(
        &mut store,
        &json!({ "id": "SO-1", "status": "bad" }),
        &json!({ "email": "admin@example.test", "role": "admin" }),
    )
    .expect_err("invalid status");
    assert_eq!(invalid.code, "invalid_status");
}

#[test]
fn admin_user_detail_matches_node_contract_without_private_fields() {
    let store = json!({
        "users": {
            "buyer@example.test": {
                "email": "buyer@example.test",
                "name": "Buyer",
                "role": "buyer",
                "passwordHash": "hidden",
                "passwordSalt": "hidden"
            }
        },
        "orders": [
            { "id": "SO-1", "userEmail": "buyer@example.test", "customer": { "email": "buyer@example.test" } },
            { "id": "SO-2", "userEmail": "other@example.test", "customer": { "email": "other@example.test", "address": "Kursk" } }
        ]
    });
    let buyer = admin_user_detail_from_values(&store, "BUYER@example.test").expect("buyer detail");
    assert_eq!(buyer["orders"].as_array().unwrap().len(), 1);
    assert!(buyer.get("passwordHash").is_none());
    assert!(buyer.get("passwordSalt").is_none());
    let order_only =
        admin_user_detail_from_values(&store, "other@example.test").expect("order-only detail");
    assert_eq!(order_only["role"], "buyer");
    assert_eq!(order_only["addresses"][0], "Kursk");
    assert!(admin_user_detail_from_values(&store, "missing@example.test").is_err());
    assert!(can_read_admin_users(&json!({ "role": "admin" })));
    assert!(can_read_admin_users(&json!({ "role": "manager" })));
    assert!(!can_read_admin_users(&json!({ "role": "buyer" })));
    assert!(can_manage_admin_users(&json!({ "role": "admin" })));
    assert!(!can_manage_admin_users(&json!({ "role": "manager" })));
    assert!(valid_admin_assignable_role("manager"));
    assert!(valid_admin_assignable_role("content"));
    assert!(!valid_admin_assignable_role("admin"));
}

#[test]
fn admin_content_roles_and_reviews_match_contract() {
    assert!(can_edit_content(&json!({ "role": "admin" })));
    assert!(can_edit_content(&json!({ "role": "content" })));
    assert!(!can_edit_content(&json!({ "role": "manager" })));
    assert!(!can_edit_content(&json!({ "role": "buyer" })));
    assert!(valid_review_status("approved"));
    assert!(valid_review_status("hidden"));
    assert!(!valid_review_status("deleted"));
    let store = json!({
        "reviews": [
            { "id": "old", "createdAt": "2026-01-01T00:00:00.000Z" },
            { "id": "new", "createdAt": "2026-02-01T00:00:00.000Z" }
        ]
    });
    let reviews = sorted_reviews_for_admin(&store);
    assert_eq!(reviews[0]["id"], "new");
    assert_eq!(reviews[1]["id"], "old");
}

#[test]
fn builds_and_persists_order_preview_record() {
    let user = json!({
        "email": "buyer@example.test",
        "name": "Buyer",
        "phone": "+7 968 959-32-54"
    });
    let data = json!({
        "items": [{
            "key": "sku-1",
            "productName": "Pillow",
            "qty": 0,
            "variant": { "sku": "sku-1", "price": 520 }
        }],
        "total": 30400,
        "customer": { "name": "Buyer" },
        "source": "site"
    });
    let trusted_items = vec![json!({
        "key": "sku-1",
        "productId": "p1",
        "productName": "Pillow",
        "productImage": "https://sobag-shop.online/products/pillow.webp",
        "qty": 1,
        "variant": { "sku": "sku-1", "name": "Pillow / 40x40 / Velour", "price": 32000 },
        "subtotal": 32000
    })];
    let order =
        build_order_record_from_trusted_items(&data, Some(&user), trusted_items).expect("order");
    assert_eq!(order["userEmail"], "buyer@example.test");
    assert_eq!(order["customer"]["phone"], "+7 968 959-32-54");
    assert_eq!(order["items"][0]["qty"], 1);
    assert_eq!(
        order["items"][0]["productImage"],
        "https://sobag-shop.online/products/pillow.webp"
    );
    assert_eq!(
        order["items"][0]["variant"]["name"],
        "Pillow / 40x40 / Velour"
    );
    let mut store = default_store_value();
    push_order_record(&mut store, order);
    assert_eq!(store["orders"].as_array().unwrap().len(), 1);
}

#[test]
fn order_create_updates_user_profile_like_node() {
    let user = json!({
        "email": "buyer@example.test",
        "name": "Buyer",
        "phone": "+7 900 000-00-00"
    });
    let data = json!({
        "items": [{ "key": "sku-1", "variant": { "sku": "sku-1", "price": 520 } }],
        "total": 30400,
        "customer": {
            "name": "Buyer",
            "company": "Sobag LLC",
            "inn": "1234567890",
            "phone": "89689593254",
            "email": "buyer@example.test",
            "city": "Kursk",
            "address": "Factory lane",
            "layoutFileName": "layout.pdf",
            "comment": "Call first"
        }
    });
    let trusted_items = vec![json!({
        "key": "sku-1",
        "productId": "p1",
        "productName": "Pillow",
        "productImage": "",
        "qty": 1,
        "variant": { "sku": "sku-1", "price": 32000 },
        "subtotal": 32000
    })];
    let order =
        build_order_record_from_trusted_items(&data, Some(&user), trusted_items).expect("order");
    let mut store = json!({
        "users": {
            "buyer@example.test": {
                "email": "buyer@example.test",
                "name": "Buyer",
                "role": "buyer",
                "addresses": ["Old address"]
            }
        },
        "orders": []
    });
    update_user_profile_from_order(&mut store, &order);
    let updated = &store["users"]["buyer@example.test"];
    assert_eq!(updated["company"], "Sobag LLC");
    assert_eq!(updated["inn"], "1234567890");
    assert_eq!(updated["phone"], "+7 968 959-32-54");
    assert_eq!(updated["addresses"][0], "Factory lane");
    assert_eq!(updated["addresses"][1], "Old address");
    assert_eq!(updated["layoutFiles"][0], "layout.pdf");
    assert_eq!(updated["orderComments"][0], "Call first");
    assert_eq!(updated["lastCustomer"]["city"], "Kursk");
}

#[test]
fn rejects_below_minimum_order_preview_record() {
    let error = build_order_record_from_trusted_items(
        &json!({
            "items": [{ "variant": { "sku": "sku-1" } }],
            "total": 29999,
            "customer": { "phone": "+7 968 959-32-54" }
        }),
        None,
        vec![json!({
            "key": "sku-1",
            "productId": "p1",
            "productName": "Pillow",
            "qty": 1,
            "variant": { "sku": "sku-1", "price": 29999 },
            "subtotal": 29999
        })],
    )
    .expect_err("minimum error");
    assert_eq!(error.code, "minimum_total");
}

#[test]
fn rejects_order_total_mismatch_with_trusted_items() {
    let error = build_order_record_from_trusted_items(
        &json!({
            "items": [{ "variant": { "sku": "sku-1", "price": 1 } }],
            "total": 30000,
            "customer": { "phone": "+7 968 959-32-54" }
        }),
        None,
        vec![json!({
            "key": "sku-1",
            "productId": "p1",
            "productName": "Pillow",
            "qty": 1,
            "variant": { "sku": "sku-1", "price": 32000 },
            "subtotal": 32000
        })],
    )
    .expect_err("mismatch error");
    assert_eq!(error.code, "ORDER_TOTAL_MISMATCH");
}

#[test]
fn buyer_order_patch_adds_public_customer_message() {
    let user = json!({ "email": "buyer@example.test", "name": "Buyer" });
    let mut store = json!({
        "orders": [{
            "id": "SO-1",
            "userEmail": "buyer@example.test",
            "customer": { "email": "buyer@example.test" },
            "crmThread": [
                { "visibility": "internal", "text": "hidden" },
                { "visibility": "customer", "text": "visible" }
            ]
        }]
    });
    let updated = apply_buyer_order_comment_patch(
        &mut store,
        &json!({ "id": "SO-1", "commentText": "Need invoice" }),
        &user,
    )
    .expect("patched order");
    assert_eq!(store["orders"][0]["updatedBy"], "buyer@example.test");
    assert_eq!(updated["crmThread"][0]["text"], "Need invoice");
    assert_eq!(updated["crmThread"].as_array().unwrap().len(), 2);
}

#[test]
fn buyer_order_patch_rejects_other_customer_order() {
    let user = json!({ "email": "buyer@example.test", "name": "Buyer" });
    let mut store = json!({
        "orders": [{
            "id": "SO-1",
            "userEmail": "other@example.test",
            "customer": { "email": "other@example.test" }
        }]
    });
    let error = apply_buyer_order_comment_patch(
        &mut store,
        &json!({ "id": "SO-1", "commentText": "Need invoice" }),
        &user,
    )
    .expect_err("not found");
    assert_eq!(error.code, "not_found");
}

#[test]
fn builds_custom_print_brief_and_order_preview_record() {
    let user = json!({ "email": "buyer@example.test", "name": "Buyer" });
    let (brief, order) = build_brief_record(
        &json!({
            "product": "Подушка",
            "quantity": 100,
            "phone": "89689593254",
            "comment": "Need sample"
        }),
        Some(&user),
    )
    .expect("brief");
    assert_eq!(brief["type"], "custom_print");
    assert_eq!(brief["phone"], "+7 968 959-32-54");
    assert_eq!(order["source"], "custom_brief");
    assert_eq!(order["customBrief"]["quantity"], 100);
    let mut store = default_store_value();
    push_brief_record(&mut store, brief, order);
    assert_eq!(store["briefs"].as_array().unwrap().len(), 1);
    assert_eq!(store["orders"].as_array().unwrap().len(), 1);
}

#[test]
fn rejects_invalid_brief_email() {
    let error = build_brief_record(
        &json!({
            "product": "Подушка",
            "quantity": 100,
            "email": "bad-email"
        }),
        None,
    )
    .expect_err("email error");
    assert_eq!(error.code, "invalid_email");
}

#[test]
fn admin_pim_report_preserves_non_zero_variant_prices() {
    let catalog = json!({
        "products": [{
            "id": "pim-product-1",
            "baseSku": "opt_pim_1",
            "name": "PIM Pillow",
            "status": "published",
            "category": "Podushki",
            "variants": [{
                "id": "pim-variant-1",
                "sku": "PIM-SKU-1",
                "type": "Pillow",
                "size": "40x40",
                "material": "Velvet",
                "name": "PIM Pillow 40x40",
                "price": 1200,
                "priceSource": "group"
            }],
            "images": [{
                "url": "https://sobag-shop.online/sobag-products/products/opt_pim_1/1.webp",
                "storageKey": "products/opt_pim_1/1.webp",
                "provider": "s3-compatible",
                "mime": "image/webp"
            }]
        }],
        "updatedAt": "2026-06-16T00:00:00.000Z",
        "version": 1
    });
    let report = pim_report_for_view(&catalog, "variants").expect("variants report");
    assert_eq!(report["view"], "variants");
    assert_eq!(report["rows"][0]["sku"], "PIM-SKU-1");
    assert_eq!(report["rows"][0]["price"], 1200);
    assert!(report["diagnostics"]["ok"].as_bool().unwrap_or(false));
}

#[test]
fn admin_price_import_builds_sku_change_and_rejects_bad_rows() {
    let record = fixture_price_record_for_test();
    let valid = json!({ "sku": "SKU-1", "price": "230" });
    let (changes, errors) =
        parse_price_import_rows_for_test(std::slice::from_ref(&record), &[valid]);
    assert!(errors.is_empty());
    assert_eq!(changes.len(), 1);
    assert_eq!(changes[0]["kind"], "sku_price");
    assert_eq!(changes[0]["newPrice"], 230);
    assert_eq!(changes[0]["oldPrices"][0], 220);

    let invalid = json!({ "group": "=SUM(A1:A2)", "price": "0" });
    let (_, errors) = parse_price_import_rows_for_test(&[record], &[invalid]);
    assert_eq!(errors[0]["error"], "formula_input_rejected");
}

#[test]
fn admin_catalog_clean_product_preserves_identity_and_price_guards() {
    let product = json!({
        "baseSku": "TEST-1",
        "name": "Test product",
        "status": "published",
        "basePrice": 0,
        "category": "Category A",
        "categories": ["Category A", "Category A"],
        "images": [
            "https://cdn.example.test/a.webp",
            { "storageKey": "products/test/a.webp", "mime": "image/webp", "width": 100 }
        ],
        "variantPrices": { "SKU-1": 250 },
        "variants": [{ "sku": "ignored" }],
        "minPrice": 1,
        "maxPrice": 2
    });
    let clean = crate::admin_catalog::clean_product_for_test(&product).expect("valid product");
    assert_eq!(clean.get("baseSku").and_then(Value::as_str), Some("TEST-1"));
    assert_eq!(clean.get("id").and_then(Value::as_str), Some("TEST-1"));
    assert_eq!(clean.get("hidden").and_then(Value::as_bool), Some(false));
    assert_eq!(clean.get("basePrice").and_then(Value::as_i64), Some(1));
    assert!(clean.get("variants").is_none());
    assert!(clean.get("minPrice").is_none());
    assert_eq!(
        clean
            .pointer("/variantPrices/SKU-1")
            .and_then(Value::as_i64),
        Some(250)
    );
    assert_eq!(
        clean.get("images").and_then(Value::as_array).unwrap().len(),
        2
    );
}

#[test]
fn admin_import_batch_preview_skips_existing_without_update() {
    let current = vec![json!({
        "baseSku": "EXIST-1",
        "name": "Existing product",
        "status": "published"
    })];
    let raw = vec![
        json!({ "baseSku": "EXIST-1", "name": "Duplicate", "basePrice": 100 }),
        json!({ "baseSku": "NEW-1", "name": "New product", "basePrice": 250, "types": ["A"], "sizes": ["40x40"], "materials": ["Velvet"] }),
    ];
    let batch = crate::admin_import_batches::make_batch_for_test(&raw, &current);
    assert_eq!(batch["counts"]["skipped"], 1);
    assert_eq!(batch["counts"]["created"], 1);
    assert_eq!(batch["rows"][0]["reason"], "base_sku_exists");
    assert_eq!(batch["products"].as_array().unwrap().len(), 1);
    assert_eq!(batch["products"][0]["product"]["basePrice"], 250);
}

#[test]
fn admin_media_guards_storage_keys_and_upload_metadata() {
    let key =
        crate::admin_media::product_image_key_for_test("../OPT 1", "../../evil.php", "image/png");
    assert!(key.starts_with("products/OPT-1/"));
    assert!(key.ends_with(".php.png"));
    assert!(crate::admin_media::validate_storage_key_for_test(
        "products/OPT-1/file.png"
    ));
    assert!(!crate::admin_media::validate_storage_key_for_test(
        "../products/OPT-1/file.png"
    ));
    assert!(!crate::admin_media::validate_storage_key_for_test(
        "products/../file.png"
    ));
    assert!(!crate::admin_media::validate_storage_key_for_test(
        "private/OPT-1/file.png"
    ));
    assert!(crate::admin_media::validate_storage_prefix_for_test(
        "products/OPT-1/"
    ));
    assert!(!crate::admin_media::validate_storage_prefix_for_test(
        "products/../"
    ));
    let image = crate::admin_media::normalize_image_for_test(json!({
        "publicUrl": "https://cdn.example/products/OPT-1/file.png",
        "key": "products/OPT-1/file.png",
        "provider": "minio",
        "width": "100",
        "height": 100,
        "contentType": "image/png"
    }));
    assert_eq!(image["provider"], "s3-compatible");
    assert_eq!(image["storageKey"], "products/OPT-1/file.png");
    assert_eq!(image["mime"], "image/png");
    assert_eq!(image["status"], "active");
    assert_eq!(
        crate::admin_media::canonical_host_for_test("http://127.0.0.1:9000/bucket/products/a.png"),
        "127.0.0.1:9000"
    );
    assert_eq!(
        crate::admin_media::canonical_host_for_test(
            "https://storage.example.test/bucket/products/a.png"
        ),
        "storage.example.test"
    );
    assert!(crate::admin_media::endpoint_matches_public_base_for_test(
        "https://sobag-shop.online/sobag-products",
        "https://sobag-shop.online/sobag-products"
    ));
    assert!(crate::admin_media::endpoint_matches_public_base_for_test(
        "https://sobag-shop.online",
        "https://sobag-shop.online/sobag-products"
    ));
    assert!(!crate::admin_media::endpoint_matches_public_base_for_test(
        "https://storage.example.test",
        "https://sobag-shop.online/sobag-products"
    ));
    assert_eq!(
        crate::admin_media::s3_url_for_test(
            "http://127.0.0.1:9000",
            "sobag-products",
            true,
            "products/OPT-1/file.png"
        ),
        "http://127.0.0.1:9000/sobag-products/products/OPT-1/file.png"
    );
    assert_eq!(
        crate::admin_media::s3_region_for_test(
            "derived-local-minio",
            "http://127.0.0.1:9000",
            "auto",
            ""
        ),
        "us-east-1"
    );
    assert_eq!(
        crate::admin_media::s3_region_for_test(
            "SOBAG_S3_LOCAL_ENDPOINT",
            "http://localhost:9000",
            "",
            "eu-central-1"
        ),
        "eu-central-1"
    );
    assert_eq!(
        crate::admin_media::s3_region_for_test(
            "SOBAG_S3_ENDPOINT",
            "https://storage.example.test",
            "auto",
            ""
        ),
        "auto"
    );
    assert_eq!(
        crate::admin_media::storage_key_prefix_for_test("products/OPT-1/file.png"),
        "products/OPT-1"
    );
    let webp_key = crate::admin_media::product_image_key_for_test(
        "opt_70190",
        "rust-media-smoke.webp",
        "image/webp",
    );
    assert!(webp_key.starts_with("products/opt_70190/"));
    assert!(webp_key.ends_with(".webp"));
}

#[test]
fn admin_pim_csv_rejects_unknown_views() {
    let catalog = json!({ "products": [{ "id": "p1", "baseSku": "opt_1", "variants": [] }] });
    let error = pim_csv_for_view(&catalog, "unknown").expect_err("unsupported csv");
    assert_eq!(error.code, "unsupported_pim_csv_view");
}
