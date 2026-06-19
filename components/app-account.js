function normalizeSavedCartText(value, limit = 1000) {
  return String(value || "").trim().slice(0, limit);
}
function normalizeSavedCartHistory(items) {
  return (Array.isArray(items) ? items : [])
    .map((entry) => ({
      at: normalizeSavedCartText(entry?.at || new Date().toISOString(), 40),
      actor: normalizeSavedCartText(entry?.actor || "", 120),
      role: normalizeSavedCartText(entry?.role || "", 40),
      type: normalizeSavedCartText(entry?.type || "comment", 40),
      text: normalizeSavedCartText(entry?.text || "", 1000),
      visibility: entry?.visibility === "internal" ? "internal" : "customer",
    }))
    .filter((entry) => entry.text)
    .slice(-20);
}
function normalizeSavedCart(item) {
  const items = cleanCartEntries(item?.items || []);
  if (!items.length) return null;
  const totals = totalsFromCartEntries(items);
  return {
    id: String(item.id || `SC-${Date.now().toString(36)}`),
    title: String(item.title || "Сохраненная корзина").trim() || "Сохраненная корзина",
    createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    date: item.date || new Date().toLocaleString("ru-RU"),
    items,
    discount: totals.discount,
    status: item.status === "sent" ? "sent" : "draft",
    sentAt: item.sentAt || "",
    sentOrderId: item.sentOrderId || "",
    customerComment: normalizeSavedCartText(item.customerComment || item.comment || ""),
    managerComment: normalizeSavedCartText(item.managerComment || ""),
    commentHistory: normalizeSavedCartHistory(item.commentHistory),
    ...totals,
  };
}
function getSavedCarts(userKey = state.currentUser) {
  const raw = JSON.parse(localStorage.getItem(getSavedCartsKey(userKey)) || "[]");
  return (Array.isArray(raw) ? raw : []).map(normalizeSavedCart).filter(Boolean).slice(0, 50);
}
function saveSavedCarts(carts, options = {}) {
  const userKey = state.currentUser;
  const normalized = (Array.isArray(carts) ? carts : []).map(normalizeSavedCart).filter(Boolean).slice(0, 50);
  localStorage.setItem(getSavedCartsKey(userKey), JSON.stringify(normalized));
  if (userKey) {
    const users = getUsers();
    if (users[userKey]) {
      users[userKey].savedCarts = normalized;
      saveUsers(users);
    }
  }
  if (options.sync !== false && personalStateReady) syncSavedCartsToBackend();
  return normalized;
}
function mergeSavedCarts(serverCarts = [], localCarts = []) {
  const merged = new Map();
  [...serverCarts, ...localCarts].forEach((item) => {
    const normalized = normalizeSavedCart(item);
    if (!normalized) return;
    const existing = merged.get(normalized.id);
    if (!existing || new Date(normalized.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) merged.set(normalized.id, normalized);
  });
  return [...merged.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 50);
}
function saveCurrentCartDraft(title = "") {
  const items = [...state.cart.entries()];
  if (!items.length) {
    showToast("Корзина пока пустая.");
    return null;
  }
  const now = new Date();
  const draft = normalizeSavedCart({
    id: `SC-${now.getTime().toString(36)}`,
    title: title || `Корзина от ${now.toLocaleDateString("ru-RU")}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    date: now.toLocaleString("ru-RU"),
    items,
  });
  const saved = saveSavedCarts([draft, ...getSavedCarts()]);
  renderSavedQuotesPage();
  showToast("Черновик корзины сохранен.");
  return saved[0];
}
function findCurrentVariantBySku(sku) {
  const key = baseSkuKey(sku);
  if (!key) return null;
  for (const product of products) {
    const variant = (product.variants || []).find((item) => baseSkuKey(item.sku) === key);
    if (variant) return { product, variant };
  }
  return null;
}
function savedCartRestoreAnalysis(cart) {
  const missingSkus = [];
  const changedPrices = [];
  const refreshedEntries = cleanCartEntries(cart.items).map(([key, line]) => {
    const sku = line?.variant?.sku || line?.variantSku || "";
    const current = findCurrentVariantBySku(sku);
    if (!current) {
      missingSkus.push(sku || key);
      return [key, line];
    }
    const oldPrice = Number(line?.variant?.price || 0);
    const newPrice = Number(current.variant.price || 0);
    const nextKey = `${current.product.id}:${current.variant.sku}`;
    if (oldPrice !== newPrice) {
      changedPrices.push({
        sku: current.variant.sku,
        oldPrice,
        newPrice,
      });
    }
    return [
      nextKey,
      {
        ...line,
        key: nextKey,
        productId: current.product.id,
        productName: current.variant.name || current.product.name || line.productName || "",
        productImage: current.product.image || line.productImage || "",
        variant: {
          ...(line.variant || {}),
          ...current.variant,
        },
      },
    ];
  });
  return { missingSkus, changedPrices, refreshedEntries };
}
function savedCartRestoreWarning(analysis) {
  const lines = [];
  if (analysis.changedPrices.length) {
    lines.push(
      `Изменились цены у ${analysis.changedPrices.length} ${pluralRu(analysis.changedPrices.length, "варианта", "вариантов", "вариантов")}.`
    );
    analysis.changedPrices.slice(0, 5).forEach((item) => {
      lines.push(`${item.sku}: было ${formatMoney(item.oldPrice)}, сейчас ${formatMoney(item.newPrice)}`);
    });
  }
  if (analysis.missingSkus.length) {
    lines.push(`Не найдены в текущем каталоге: ${analysis.missingSkus.slice(0, 8).join(", ")}.`);
  }
  return lines.join("\n");
}
function restoreSavedCart(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик корзины не найден.");
    return;
  }
  const analysis = savedCartRestoreAnalysis(draft);
  const warning = savedCartRestoreWarning(analysis);
  if (warning && !window.confirm(`В сохраненном КП есть расхождения с текущим каталогом:\n\n${warning}\n\nВосстановить КП с актуальными ценами там, где SKU найден?`)) {
    return;
  }
  state.cart = new Map(analysis.refreshedEntries);
  saveCart();
  renderCart();
  closeModal();
  navigateWithinSite("cart.html");
  showToast(warning ? "КП восстановлено с учетом актуальных цен." : "Черновик восстановлен в корзину.");
}
function deleteSavedCart(cartId) {
  saveSavedCarts(getSavedCarts().filter((item) => item.id !== cartId));
  refreshSavedCartViews();
  showToast("Черновик удален.");
}
function updateSavedCart(cartId, patch) {
  const next = getSavedCarts().map((item) =>
    item.id === cartId
      ? {
          ...item,
          ...patch,
          updatedAt: new Date().toISOString(),
          date: new Date().toLocaleString("ru-RU"),
        }
      : item
  );
  const saved = saveSavedCarts(next);
  return saved.find((item) => item.id === cartId) || null;
}
function renameSavedCart(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик корзины не найден.");
    return;
  }
  const title = window.prompt("Название сохраненного КП", draft.title) || "";
  const prepared = title.trim();
  if (!prepared || prepared === draft.title) return;
  updateSavedCart(cartId, { title: prepared, status: draft.status || "draft" });
  refreshSavedCartViews();
  showToast("Название КП обновлено.");
}
function savedCartFileName(cart, extension) {
  const slug =
    String(cart.title || cart.id || "quote")
      .toLocaleLowerCase("ru-RU")
      .replace(/[^a-zа-яё0-9]+/giu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "quote";
  return `sobag-${slug}-${cart.id}.${extension}`;
}
function canViewSavedCartInternal() {
  return canManageOrders(getUsers()[state.currentUser]);
}
function savedCartQuoteRows(cart, options = {}) {
  const totals = totalsFromCartEntries(cart.items);
  const includeInternal = Boolean(options.includeInternal);
  return [
    ["Коммерческое предложение Sobag Opt"],
    ["Название", cart.title],
    ["Дата", new Date(cart.updatedAt || cart.createdAt || Date.now()).toLocaleString("ru-RU")],
    ["Статус", cart.status === "sent" ? "Отправлено менеджеру" : "Черновик"],
    ["Номер заказа", cart.sentOrderId || ""],
    ["Комментарий покупателя", cart.customerComment || ""],
    ...(includeInternal ? [["Комментарий менеджера", cart.managerComment || ""]] : []),
    ["Сумма товаров", totals.subtotal],
    ["Скидка по корзине", `${totals.discount}%`],
    ["Итого", totals.total],
    [],
    ["Артикул", "Наименование", "Тип", "Размер", "Материал", "Количество", "Цена до скидки", "Цена со скидкой", "Сумма"],
    ...cleanCartEntries(cart.items).map(([, line]) => {
      const unit = discountedUnitPrice(line.variant?.price || 0, totals.discount);
      return [
        line.variant?.sku || "",
        line.productName || line.variant?.name || "",
        line.variant?.type || "",
        line.variant?.size || "",
        line.variant?.material || "",
        line.qty || 0,
        line.variant?.price || 0,
        unit,
        unit * (line.qty || 0),
      ];
    }),
  ];
}
async function downloadSavedCartQuote(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик корзины не найден.");
    return;
  }
  const rows = savedCartQuoteRows(draft, { includeInternal: canViewSavedCartInternal() });
  if (await downloadRowsXlsx(rows, savedCartFileName(draft, "xlsx"), "КП")) {
    showToast("КП скачано в XLSX.");
    return;
  }
  downloadCsv(savedCartFileName(draft, "csv"), rows);
  showToast("XLSX недоступен на этой странице, скачан CSV.");
}
function printSavedCartQuote(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик корзины не найден.");
    return;
  }
  const totals = totalsFromCartEntries(draft.items);
  const rows = cleanCartEntries(draft.items)
    .map(([, line]) => {
      const unit = discountedUnitPrice(line.variant?.price || 0, totals.discount);
      return `<tr><td>${escapeHtml(line.variant?.sku || "")}</td><td>${escapeHtml(line.productName || line.variant?.name || "")}</td><td>${escapeHtml([line.variant?.type, line.variant?.size, line.variant?.material].filter(Boolean).join(", "))}</td><td>${line.qty || 0}</td><td>${formatMoney(unit)}</td><td>${formatMoney(unit * (line.qty || 0))}</td></tr>`;
    })
    .join("");
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    showToast("Браузер заблокировал окно печати.");
    return;
  }
  const includeInternal = canViewSavedCartInternal();
  const comments = [
    draft.customerComment ? `<p><b>Комментарий покупателя:</b> ${escapeHtml(draft.customerComment)}</p>` : "",
    includeInternal && draft.managerComment ? `<p><b>Комментарий менеджера:</b> ${escapeHtml(draft.managerComment)}</p>` : "",
  ].join("");
  win.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(draft.title)} · Sobag Opt</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{font-size:28px}p{margin:6px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}.total{font-size:22px;font-weight:800;margin-top:18px}</style></head><body><h1>${escapeHtml(draft.title)}</h1><p>Коммерческое предложение Sobag Opt</p><p>Статус: ${draft.status === "sent" ? "отправлено менеджеру" : "черновик"}</p><p>Скидка по корзине: ${totals.discount}%</p>${comments}<table><thead><tr><th>Артикул</th><th>Наименование</th><th>Параметры</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Итого: ${formatMoney(totals.total)}</p><script>window.print();</script></body></html>`);
  win.document.close();
}
function customerFromSavedCartProfile(user, draft) {
  const note = `Заказ создан из сохраненного КП "${draft.title}".`;
  const comment = [note, draft.customerComment ? `Комментарий к КП: ${draft.customerComment}` : "", user.orderComment || user.lastCustomer?.comment || ""].filter(Boolean).join("\n");
  return {
    name: user.name || user.company || "",
    email: user.email || state.currentUser || "",
    company: user.company || user.lastCustomer?.company || "",
    inn: user.inn || user.lastCustomer?.inn || "",
    kpp: user.kpp || user.lastCustomer?.kpp || "",
    phone: user.phone || user.lastCustomer?.phone || "",
    city: user.city || user.lastCustomer?.city || "",
    address: user.address || user.lastCustomer?.address || user.addresses?.[0] || "",
    legalAddress: user.legalAddress || user.lastCustomer?.legalAddress || "",
    delivery: user.delivery || user.lastCustomer?.delivery || "",
    packaging: user.packaging || user.lastCustomer?.packaging || "",
    layoutFileName: user.layoutFiles?.[0] || user.lastCustomer?.layoutFileName || "",
    comment,
  };
}
async function sendSavedCartToManager(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  const user = getUsers()[state.currentUser];
  if (!draft || !user) {
    showToast("Черновик КП не найден.");
    return;
  }
  const customer = customerFromSavedCartProfile(user, draft);
  if (!String(customer.company || "").trim() || !String(customer.phone || "").trim()) {
    showToast("Заполните компанию и телефон в профиле перед отправкой КП менеджеру.");
    return;
  }
  const items = cleanCartEntries(draft.items).map(([, line]) => line);
  const totals = totalsFromCartEntries(draft.items);
  if (totals.total < MIN_CART_TOTAL) {
    showToast(`Минимальная сумма заказа ${formatMoney(MIN_CART_TOTAL)}. Осталось ${formatMoney(MIN_CART_TOTAL - totals.total)}.`);
    return;
  }
  if (!window.confirm(`Отправить менеджеру КП "${draft.title}" на сумму ${formatMoney(draft.total)}?`)) return;
  let order = null;
  try {
    const result = await apiRequest("/api/orders", {
      method: "POST",
      body: {
        customer,
        items,
        total: totals.total,
        source: "saved_cart",
      },
    });
    order = result.order;
    if (order) mirrorServerOrder(order, state.currentUser);
  } catch (error) {
    showToast(serverSaveErrorMessage(error, "Не удалось сохранить КП на сервере. Попробуйте еще раз."));
    return;
  }
  if (!order) {
    showToast("Сервер не вернул номер заказа. Попробуйте еще раз.");
    return;
  }
  updateSavedCart(cartId, {
    status: "sent",
    sentAt: new Date().toISOString(),
    sentOrderId: order.id || "",
    commentHistory: [
      ...normalizeSavedCartHistory(draft.commentHistory),
      {
        at: new Date().toISOString(),
        actor: user.name || user.email || "Покупатель",
        role: "buyer",
        type: "sent",
        visibility: "customer",
        text: `КП отправлено менеджеру как заказ ${order.id || ""}.`,
      },
    ],
  });
  refreshSavedCartViews();
  showToast(`КП отправлено менеджеру. Заказ ${order.id || ""}`);
}
function saveSavedCartComments(form) {
  const cartId = form.dataset.savedCartCommentForm;
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик КП не найден.");
    return;
  }
  const user = getUsers()[state.currentUser] || {};
  const data = Object.fromEntries(new FormData(form).entries());
  const customerComment = normalizeSavedCartText(data.customerComment || "");
  const managerComment = canManageOrders(user) ? normalizeSavedCartText(data.managerComment || "") : draft.managerComment || "";
  const history = normalizeSavedCartHistory(draft.commentHistory);
  if (customerComment !== (draft.customerComment || "")) {
    history.push({
      at: new Date().toISOString(),
      actor: user.name || user.email || "Покупатель",
      role: user.role || "buyer",
      type: "comment",
      visibility: "customer",
      text: customerComment ? `Комментарий покупателя обновлен: ${customerComment}` : "Комментарий покупателя очищен.",
    });
  }
  if (managerComment !== (draft.managerComment || "")) {
    history.push({
      at: new Date().toISOString(),
      actor: user.name || user.email || "Менеджер",
      role: user.role || "manager",
      type: "manager_comment",
      visibility: "internal",
      text: managerComment ? `Внутренний комментарий менеджера обновлен: ${managerComment}` : "Внутренний комментарий менеджера очищен.",
    });
  }
  updateSavedCart(cartId, {
    customerComment,
    managerComment,
    commentHistory: history,
  });
  refreshSavedCartViews();
  showToast("Комментарии КП сохранены.");
}
async function submitProductReview(form) {
  const product = products.find((item) => item.id === form.dataset.reviewForm);
  const user = getUsers()[state.currentUser];
  if (!product || !user) {
    showToast("Войдите или зарегистрируйтесь, чтобы оставить отзыв.");
    openAccount();
    return;
  }
  if (userHasSubmittedReview(user, product)) {
    showToast("Вы уже отправили отзыв на этот товар.");
    refreshProductModal();
    return;
  }
  if (!userHasEligibleReviewOrder(user, product)) {
    showToast("Оставить отзыв можно после заказа этого товара.");
    refreshProductModal();
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const rating = Math.max(1, Math.min(5, Math.round(Number(data.rating || 0))));
  const text = String(data.text || "").trim();
  if (!rating || text.length < 5) {
    showToast("Поставьте оценку и напишите отзыв от 5 символов.");
    return;
  }
  try {
    const result = await apiRequest("/api/auth/me", {
      method: "PUT",
      body: {
        review: {
          productId: product.id,
          baseSku: product.baseSku,
          productName: product.name,
          rating,
          text,
        },
      },
    });
    if (result.user) saveServerUserProfile(result.user);
    form.reset();
    setReviewFormRating(form, 5);
    showToast("Отзыв отправлен на модерацию.");
  } catch (error) {
    if (error.status === 401) {
      showToast("Войдите в аккаунт, чтобы оставить отзыв.");
      openAccount();
      return;
    }
    showToast(error.message || "Не удалось отправить отзыв.");
  }
}
function setReviewFormRating(form, rating) {
  const prepared = Math.max(1, Math.min(5, Math.round(Number(rating || 0))));
  const input = form?.querySelector('input[name="rating"]');
  if (input) input.value = prepared;
  form?.querySelectorAll("[data-review-star]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.reviewStar || 0) <= prepared);
  });
}
function uniqueTextList(values, limit = 10, itemLimit = 240) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => String(item || "").trim().slice(0, itemLimit))
        .filter(Boolean)
    ),
  ].slice(0, limit);
}
function textAreaLines(value, limit = 10, itemLimit = 240) {
  return uniqueTextList(String(value || "").split(/\r?\n/), limit, itemLimit);
}
function parseCompanyProfiles(value, primary = {}) {
  const rows = textAreaLines(value, 10, 600)
    .map((line) => {
      const [name = "", inn = "", kpp = "", legalAddress = ""] = line.split(";").map((part) => part.trim());
      return {
        name: name.slice(0, 180),
        inn: inn.replace(/\D/g, "").slice(0, 12),
        kpp: kpp.replace(/\D/g, "").slice(0, 9),
        legalAddress: legalAddress.slice(0, 240),
      };
    })
    .filter((company) => company.name || company.inn);
  const prepared = [primary, ...rows]
    .map((company) => ({
      name: String(company?.name || company?.company || "").trim().slice(0, 180),
      inn: String(company?.inn || "").replace(/\D/g, "").slice(0, 12),
      kpp: String(company?.kpp || "").replace(/\D/g, "").slice(0, 9),
      legalAddress: String(company?.legalAddress || "").trim().slice(0, 240),
    }))
    .filter((company) => company.name || company.inn);
  const seen = new Set();
  return prepared
    .filter((company) => {
      const key = company.inn || company.name.toLocaleLowerCase("ru-RU");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}
function companiesToText(user = {}) {
  const primaryKey = user.inn || String(user.company || "").toLocaleLowerCase("ru-RU");
  return (user.companies || [])
    .filter((company) => {
      const key = company.inn || String(company.name || "").toLocaleLowerCase("ru-RU");
      return key && key !== primaryKey;
    })
    .map((company) => [company.name, company.inn, company.kpp, company.legalAddress].filter(Boolean).join("; "))
    .join("\n");
}
function linesToText(values = []) {
  return uniqueTextList(values, 20, 500).join("\n");
}
async function saveProfileForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const currentUserData = getUsers()[state.currentUser] || {};
  const primaryAddress = String(data.address || "").trim();
  const addresses = uniqueTextList([primaryAddress, ...textAreaLines(data.addresses, 10, 240), ...(currentUserData.addresses || [])], 10, 240);
  const layoutFiles = uniqueTextList([...textAreaLines(data.layoutFiles, 20, 240), ...(currentUserData.layoutFiles || [])], 20, 240);
  const orderComment = String(data.orderComment || "").trim();
  const orderComments = uniqueTextList([orderComment, ...textAreaLines(data.orderComments, 10, 500), ...(currentUserData.orderComments || [])], 10, 500);
  const profile = {
    name: String(data.name || "").trim(),
    phone: formatPhoneNumber(data.phone),
    company: String(data.company || "").trim(),
    inn: String(data.inn || "").replace(/\D/g, ""),
    kpp: String(data.kpp || "").replace(/\D/g, ""),
    legalAddress: String(data.legalAddress || "").trim(),
    city: String(data.city || "").trim(),
    address: primaryAddress,
    delivery: String(data.delivery || "").trim(),
    packaging: String(data.packaging || "").trim(),
    orderComment,
    addresses,
    layoutFiles,
    orderComments,
  };
  profile.companies = parseCompanyProfiles(data.companies, {
    name: profile.company,
    inn: profile.inn,
    kpp: profile.kpp,
    legalAddress: profile.legalAddress,
  });
  if (profile.inn && ![10, 12].includes(profile.inn.length)) {
    setFieldError(form, "inn", "ИНН должен содержать 10 или 12 цифр.");
    return;
  }
  if (profile.kpp && profile.kpp.length !== 9) {
    setFieldError(form, "kpp", "КПП должен содержать 9 цифр.");
    return;
  }
  const users = getUsers();
  const user = users[state.currentUser];
  if (!user) return;
  let savedOnServer = false;
  try {
    const result = await apiRequest("/api/auth/me", { method: "PUT", body: { profile } });
    if (result.user) {
      saveServerUserProfile({ ...result.user, ...profile, savedCarts: getSavedCarts() });
      savedOnServer = true;
    }
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) {
      if (error.status === 401 && (await promoteLocalLoginToBackend())) {
        await saveProfileForm(form);
        return;
      }
      if (error.status === 401) {
        state.backendSession = { checked: true, available: true, user: null };
        showToast("Войдите заново, чтобы сохранить профиль на сервере.");
        return;
      }
      showToast(error.message || "Не удалось сохранить профиль на сервере.");
      return;
    }
  }
  if (!savedOnServer) {
    const currentUsers = getUsers();
    const currentUser = currentUsers[state.currentUser];
    if (!currentUser) return;
    currentUsers[state.currentUser] = {
      ...currentUser,
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    saveUsers(currentUsers);
  }
  showToast(savedOnServer ? "Профиль сохранен на сервере." : "Профиль сохранен.");
  rerenderAccountModal();
}
async function addManagerEmployee(form) {
  clearFormErrors(form);
  const data = Object.fromEntries(new FormData(form).entries());
  const email = String(data.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError(form, "email", "Проверьте email сотрудника.");
    return;
  }
  try {
    const result = await apiRequest("/api/admin/users", {
      method: "POST",
      body: {
        email,
        name: String(data.name || "").trim(),
        phone: formatPhoneNumber(data.phone),
      },
    });
    if (result.user) {
      const users = getUsers();
      users[result.user.email] = { ...(users[result.user.email] || {}), ...result.user, password: users[result.user.email]?.password || "__server__" };
      saveUsers(users);
    }
    showToast("Менеджер добавлен на сервере.");
    rerenderAccountModal();
  } catch (error) {
    showToast(error.message || "Не удалось добавить менеджера.");
  }
}
async function removeManagerEmployee(email) {
  const targetEmail = String(email || "").trim().toLowerCase();
  if (!targetEmail) return;
  try {
    const result = await apiRequest("/api/admin/users", { method: "DELETE", body: { email: targetEmail } });
    if (result.user) {
      const users = getUsers();
      users[result.user.email] = { ...(users[result.user.email] || {}), ...result.user, password: users[result.user.email]?.password || "__server__" };
      saveUsers(users);
    }
    showToast("Менеджер удален из сотрудников.");
    rerenderAccountModal();
  } catch (error) {
    showToast(error.message || "Не удалось удалить менеджера.");
  }
}
function rerenderAccountModal() {
  const modal = document.querySelector("#accountModal");
  if (!modal) return;
  modal.remove();
  document.body.insertAdjacentHTML("beforeend", accountModalHtml());
  activateModal(document.querySelector("#accountModal"));
  if (window.lucide) window.lucide.createIcons();
}
function switchAccountTab(tab) {
  const modal = document.querySelector("#accountModal");
  if (!modal) return;
  state.accountTab = tab;
  modal.querySelectorAll("[data-account-tab]").forEach((button) => {
    const active = button.dataset.accountTab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  modal.querySelectorAll("[data-account-tab-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.accountTabPanel === tab);
  });
}
function syncCartToBackend() {
  if (!state.currentUser) return;
  window.clearTimeout(cartSyncTimer);
  const items = [...state.cart.entries()];
  cartSyncTimer = window.setTimeout(() => {
    apiRequest("/api/auth/me", { method: "PUT", body: { cartItems: items } }).catch((error) => {
      if (!isBackendUnavailable(error)) console.warn(error);
    });
  }, 250);
}
function syncFavoritesToBackend() {
  if (!state.currentUser) return;
  window.clearTimeout(favoritesSyncTimer);
  const items = [...state.favorites];
  favoritesSyncTimer = window.setTimeout(() => {
    apiRequest("/api/auth/me", { method: "PUT", body: { favoriteItems: items } }).catch((error) => {
      if (!isBackendUnavailable(error)) console.warn(error);
    });
  }, 250);
}
function syncSavedCartsToBackend() {
  if (!state.currentUser) return;
  window.clearTimeout(savedCartsSyncTimer);
  const savedCarts = getSavedCarts();
  savedCartsSyncTimer = window.setTimeout(() => {
    apiRequest("/api/auth/me", { method: "PUT", body: { savedCarts } }).catch((error) => {
      if (!isBackendUnavailable(error)) console.warn(error);
    });
  }, 250);
}
async function loadServerPersonalState() {
  if (!state.currentUser) return false;
  try {
    const personalData = await apiRequest("/api/auth/me");
    const serverCart = cleanCartEntries(personalData.cartItems || []);
    const localCart = cleanCartEntries([...state.cart.entries()]);
    const mergedCart = new Map(serverCart);
    localCart.forEach(([key, line]) => mergedCart.set(key, line));
    state.cart = mergedCart;
    localStorage.setItem(getCartKey(), JSON.stringify([...state.cart.entries()]));
    const mergedFavorites = [...new Set([...cleanFavoriteIds(personalData.favoriteItems || []), ...state.favorites])];
    state.favorites = new Set(mergedFavorites);
    localStorage.setItem(getFavoritesKey(), JSON.stringify([...state.favorites]));
    const mergedSavedCarts = mergeSavedCarts(personalData.savedCarts || [], getSavedCarts());
    saveSavedCarts(mergedSavedCarts, { sync: false });
    personalStateReady = true;
    syncCartToBackend();
    syncFavoritesToBackend();
    syncSavedCartsToBackend();
    renderCart();
    renderProducts();
    renderAccountButton();
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401) console.warn(error);
    personalStateReady = true;
    return false;
  }
}
function repeatOrder(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  const items = (order?.items || []).filter((line) => line?.variant?.sku);
  if (!items.length) {
    showToast("В заказе нет позиций, которые можно повторить.");
    return;
  }
  items.forEach((line) => {
    const variant = line.variant || {};
    const key = `${line.productId || variant.sku}:${variant.sku}`;
    const existing = state.cart.get(key);
    state.cart.set(key, {
      key,
      productId: line.productId || "",
      productName: line.productName || variant.name || "",
      productImage: line.productImage || "",
      variant,
      qty: Math.max(1, Number(existing?.qty || 0) + Number(line.qty || 1)),
    });
  });
  saveCart();
  renderCart();
  showToast(`Позиции из заказа ${order.id} добавлены в корзину.`);
}
