use super::*;

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
fn verifies_node_pbkdf2_password_fixture() {
    assert_eq!(PBKDF2_ITERATIONS, 310_000);
    assert_eq!(PBKDF2_KEY_LEN, 32);
    assert!(verify_password_hash(
        "Qwerty1234567899",
        "00112233445566778899aabbccddeeff",
        "642284d450b3032d40340ccc7fc96fdaca2ffd9564761ecf7615269b4bef46f8"
    ));
    assert!(!verify_password_hash(
        "wrong",
        "00112233445566778899aabbccddeeff",
        "642284d450b3032d40340ccc7fc96fdaca2ffd9564761ecf7615269b4bef46f8"
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
