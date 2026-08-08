/* =========================================================================
   DMart Manager — Store Console
   Products & customers are a real seeded master catalog (120+ SKUs).
   There is NO fake billing history — every sale, stat, and report on
   screen is generated only from bills you actually ring up in this app.
   State persists locally in the browser via localStorage.
========================================================================= */
"use strict";

const STORAGE_KEY = "dmart-console-v1";
const PAGE_SIZE = 18;
const TAX_RATE = 0.05;

/* ---------------- PRODUCT CATALOG DEFINITION (real, seeded — 120+ SKUs) --------------- */
const CATALOG_DEF = {
  "Grocery & Staples": { code: "GR", price: [25, 650], items: [
    "Basmati Rice 5kg","Sona Masoori Rice 5kg","Toor Dal 1kg","Moong Dal 1kg","Chana Dal 1kg",
    "Masoor Dal 1kg","Sunflower Oil 1L","Mustard Oil 1L","Groundnut Oil 1L","Wheat Atta 5kg",
    "Sugar 1kg","Iodised Salt 1kg","Besan 1kg","Poha 500g","Rava 1kg",
    "Tea Powder 250g","Instant Coffee 100g","Turmeric Powder 100g","Red Chilli Powder 100g","Garam Masala 50g"
  ]},
  "Dairy & Breakfast": { code: "DA", price: [20, 320], items: [
    "Toned Milk 1L","Full Cream Milk 1L","Curd 400g","Paneer 200g","Butter 100g",
    "Cheese Slices 200g","Ghee 500ml","Cornflakes 500g","Oats 1kg","Bread White 400g",
    "Brown Bread 400g","Eggs Tray 6pc"
  ]},
  "Fruits & Vegetables": { code: "FV", price: [15, 220], items: [
    "Banana 1 Dozen","Apple 1kg","Onion 1kg","Potato 1kg","Tomato 1kg",
    "Carrot 500g","Cabbage 1pc","Cauliflower 1pc","Cucumber 500g","Spinach Bunch",
    "Capsicum 500g","Lemon 250g","Ginger 250g","Garlic 250g","Orange 1kg","Grapes 500g"
  ]},
  "Bakery": { code: "BK", price: [20, 180], items: [
    "Pav Bread 6pc","Rusk 200g","Butter Cookies 200g","Chocolate Cake Slice","Sweet Bun 6pc",
    "Khari Biscuit 200g","Chocolate Muffin 4pc","Croissant 2pc"
  ]},
  "Snacks & Namkeen": { code: "SN", price: [15, 150], items: [
    "Potato Chips 100g","Namkeen Mixture 200g","Banana Chips 150g","Roasted Peanuts 200g","Popcorn 100g",
    "Bhujia 200g","Cream Biscuits 150g","Marie Biscuits 250g","Digestive Biscuits 200g","Chocolate Bar",
    "Wafer Rolls Pack","Instant Noodles 4-Pack","Instant Pasta 200g","Ready Soup Mix"
  ]},
  "Beverages": { code: "BV", price: [15, 180], items: [
    "Mineral Water 1L","Soft Drink 750ml","Fruit Juice 1L","Energy Drink 250ml","Buttermilk 500ml",
    "Sweet Lassi 200ml","Green Tea 25 Bags","Coconut Water 200ml","Soda 750ml","Milkshake 200ml",
    "Iced Tea 500ml","Herbal Tea 20 Bags"
  ]},
  "Personal Care": { code: "PC", price: [35, 420], items: [
    "Toothpaste 150g","Toothbrush Pack","Shampoo 340ml","Hair Oil 200ml","Bathing Soap 3-Pack",
    "Body Lotion 200ml","Face Wash 100g","Deodorant Spray","Razor Pack","Sanitary Pads Pack",
    "Hand Sanitizer 200ml","Face Cream 50g"
  ]},
  "Household & Cleaning": { code: "HH", price: [30, 380], items: [
    "Dish Wash Liquid 500ml","Laundry Detergent 1kg","Floor Cleaner 1L","Toilet Cleaner 500ml","Glass Cleaner 500ml",
    "Air Freshener Spray","Scrub Pads Pack","Garbage Bags Roll","Aluminium Foil 10m","Cling Wrap 10m",
    "Mosquito Repellent","Matchbox Pack","Tissue Paper Box","Shoe Polish"
  ]},
  "Baby Care": { code: "BC", price: [60, 650], items: [
    "Baby Diapers Pack M","Baby Wipes Pack","Baby Powder 200g","Baby Lotion 200ml","Baby Soap 75g","Baby Cereal 300g"
  ]},
  "Frozen & Ready-to-Eat": { code: "FR", price: [40, 320], items: [
    "Frozen Green Peas 500g","Frozen Paratha 5pc","Ice Cream Tub 700ml","Frozen Chicken Nuggets 400g",
    "Ready Meal Rice 250g","Frozen French Fries 400g","Frozen Veg Momos 400g","Frozen Sweet Corn 500g"
  ]}
};
const CATEGORIES = Object.keys(CATALOG_DEF);
const CATEGORY_BG = {
  "Grocery & Staples":"F3E0B8", "Dairy & Breakfast":"DCEAF0", "Fruits & Vegetables":"DCEFD1",
  "Bakery":"F1DFC2", "Snacks & Namkeen":"F5E9B8", "Beverages":"F3D9CB", "Personal Care":"E6DCEF",
  "Household & Cleaning":"D9E8E4", "Baby Care":"F5DCE2", "Frozen & Ready-to-Eat":"D9E3F5"
};

/* ---------------- deterministic seed (same catalog every run, no randomness drift) --------------- */
function hashStr(str){
  let h = 2166136261;
  for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
function seededRand(seed){
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function buildCatalog(){
  const products = [];
  let id = 1;
  CATEGORIES.forEach(cat => {
    const def = CATALOG_DEF[cat];
    def.items.forEach((name, i) => {
      const baseSeed = hashStr(cat + "|" + name);
      const r1 = seededRand(baseSeed);
      const r2 = seededRand(baseSeed + 101);
      const r3 = seededRand(baseSeed + 202);
      let price = def.price[0] + r1 * (def.price[1] - def.price[0]);
      price = price > 100 ? Math.round(price/5)*5 : Math.round(price);
      const stock = Math.round(10 + r2 * 70);
      const reorder = Math.round(10 + r3 * 10);
      products.push({
        id: id++,
        name,
        category: cat,
        sku: `${def.code}-${1001+i}`,
        price,
        stock,
        reorder
      });
    });
  });
  return products;
}

function buildCustomers(){
  const seed = [
    ["Aarav Sharma","98230 11245","aarav.sharma@example.com"],
    ["Priya Nair","90210 55678","priya.nair@example.com"],
    ["Rohan Mehta","99887 34521","rohan.mehta@example.com"],
    ["Ananya Iyer","91234 87650","ananya.iyer@example.com"],
    ["Vikram Desai","88990 12233","vikram.desai@example.com"],
    ["Kavya Reddy","97865 44120","kavya.reddy@example.com"],
    ["Ishaan Gupta","96543 22110","ishaan.gupta@example.com"],
    ["Meera Joshi","95012 66789","meera.joshi@example.com"],
    ["Arjun Kapoor","93421 90087","arjun.kapoor@example.com"],
    ["Diya Verma","92110 33456","diya.verma@example.com"]
  ];
  return seed.map((s,i) => ({ id: i+1, name: s[0], phone: s[1], email: s[2] }));
}

/* ---------------- STATE ---------------- */
let state = { products: [], customers: [], transactions: [], nextTxId: 1, nextCustId: 1, nextProdId: 1 };
let cart = [];
let currentView = "dashboard";
let posCategory = "";
let posSearchTerm = "";
let invSearchTerm = "", invCategoryTerm = "", invPage = 1;
let custSearchTerm = "", custPage = 1;
let reportRange = "all";
let payMethod = "Cash";
let editingProductId = null;
let editingCustomerId = null;

/* ---------------- UTIL ---------------- */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const fmt = n => "₹" + Number(n||0).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2});
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function todayKey(d){ const x = new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,10); }
function fmtTime(iso){ const d = new Date(iso); return d.toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); }
function thumb(cat, size){
  const bg = CATEGORY_BG[cat] || "E7EBDC";
  const initial = (cat||"?").charAt(0);
  return `<div class="ledger-thumb" style="background:#${bg};${size?`width:${size}px;height:${size}px;`:""}">${esc(initial)}</div>`;
}
function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> t.classList.remove("show"), 2400);
}

/* ---------------- PERSISTENCE ---------------- */
function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products: state.products, customers: state.customers, transactions: state.transactions,
      nextTxId: state.nextTxId, nextCustId: state.nextCustId, nextProdId: state.nextProdId
    }));
  }catch(e){ /* storage unavailable — app still works for this session */ }
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return null;
}
function initState(){
  const saved = loadState();
  if(saved && Array.isArray(saved.products) && saved.products.length){
    state.products = saved.products;
    state.customers = (saved.customers && saved.customers.length) ? saved.customers : buildCustomers();
    state.transactions = saved.transactions || [];
    state.nextTxId = saved.nextTxId || (state.transactions.reduce((m,t)=>Math.max(m,t.id),0)+1);
    state.nextCustId = saved.nextCustId || (state.customers.reduce((m,c)=>Math.max(m,c.id),0)+1);
    state.nextProdId = saved.nextProdId || (state.products.reduce((m,p)=>Math.max(m,p.id),0)+1);
  } else {
    state.products = buildCatalog();
    state.customers = buildCustomers();
    state.transactions = [];
    state.nextTxId = 1;
    state.nextCustId = state.customers.length + 1;
    state.nextProdId = state.products.length + 1;
    saveState();
  }
}

/* ---------------- DERIVED HELPERS ---------------- */
function productById(id){ return state.products.find(p => p.id === Number(id)); }
function customerById(id){ return id ? state.customers.find(c => c.id === Number(id)) : null; }
function isLow(p){ return p.stock <= p.reorder; }
function txInRange(range){
  if(range === "all") return state.transactions;
  const now = new Date();
  return state.transactions.filter(t => {
    const d = new Date(t.time);
    if(range === "today") return todayKey(d) === todayKey(now);
    if(range === "week"){ const diff=(now-d)/86400000; return diff>=0 && diff<7; }
    if(range === "month") return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
    return true;
  });
}

/* ---------------- NAVIGATION ---------------- */
const VIEW_META = {
  dashboard: ["Dashboard", "Today's snapshot across your store"],
  billing: ["Billing", "Search products and ring up a new bill"],
  inventory: ["Inventory", "Manage stock levels and product master data"],
  customers: ["Customers", "Your customer directory and purchase history"],
  reports: ["Reports", "Sales performance from real transactions"]
};
function switchView(view){
  currentView = view;
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + view));
  $("#viewTitle").textContent = VIEW_META[view][0];
  $("#viewSub").textContent = VIEW_META[view][1];
  closeSidebar();
  if(view === "dashboard") renderDashboard();
  if(view === "billing") renderBilling();
  if(view === "inventory") renderInventory();
  if(view === "customers") renderCustomers();
  if(view === "reports") renderReports();
}
function closeSidebar(){
  $("#sidebar").classList.remove("open");
  $("#sidebarBackdrop").classList.remove("show");
}

/* ================= DASHBOARD ================= */
function renderDashboard(){
  const today = txInRange("today");
  const todaySales = today.reduce((s,t)=>s+t.total,0);
  const lowStock = state.products.filter(isLow);

  $("#statTickets").innerHTML = [
    ["Today's Sales", fmt(todaySales), today.length + " bills today"],
    ["Bills Today", today.length, "transactions rung up"],
    ["Low Stock Items", lowStock.length, "at or below reorder level", lowStock.length>0],
    ["Total Products", state.products.length, "SKUs in catalog"]
  ].map(([label,val,sub,alert]) => `
    <div class="ticket${alert?" alert":""}"><small>${esc(label)}</small><strong>${val}</strong><span>${esc(sub)}</span></div>
  `).join("");

  $("#lowStockCount").textContent = lowStock.length + " items";
  const lowSorted = [...lowStock].sort((a,b)=>a.stock-b.stock).slice(0,8);
  $("#lowStockLedger").innerHTML = lowSorted.length ? lowSorted.map(p => `
    <div class="ledger-row">
      ${thumb(p.category)}
      <div class="ledger-main"><strong>${esc(p.name)}</strong><small>${esc(p.sku)} · ${esc(p.category)}</small></div>
      <div class="ledger-value low"><strong>${p.stock} left</strong>reorder at ${p.reorder}</div>
    </div>`).join("") : `<p class="empty-note">Stock levels look healthy — nothing at reorder point.</p>`;

  const recent = [...state.transactions].sort((a,b)=> new Date(b.time)-new Date(a.time)).slice(0,8);
  $("#txCountToday").textContent = today.length + " today";
  $("#recentTxLedger").innerHTML = recent.length ? recent.map(t => {
    const cust = customerById(t.customerId);
    return `<div class="ledger-row">
      ${thumb(t.items[0] ? t.items[0].category : "", null)}
      <div class="ledger-main"><strong>Bill #${t.id} · ${t.items.length} item${t.items.length>1?"s":""}</strong><small>${esc(cust?cust.name:"Walk-in")} · ${fmtTime(t.time)}</small></div>
      <div class="ledger-value"><strong>${fmt(t.total)}</strong>${esc(t.payMethod)}</div>
    </div>`;
  }).join("") : `<p class="empty-note">No sales recorded yet — head to Billing to ring up your first sale.</p>`;

  renderSalesChart();
}
function renderSalesChart(){
  const days = [];
  const now = new Date();
  for(let i=6;i>=0;i--){
    const d = new Date(now); d.setDate(now.getDate()-i);
    days.push(d);
  }
  const totals = days.map(d => state.transactions.filter(t => todayKey(t.time)===todayKey(d)).reduce((s,t)=>s+t.total,0));
  const max = Math.max(...totals, 1);
  $("#weekTotalChip").textContent = fmt(totals.reduce((a,b)=>a+b,0));
  $("#salesChart").innerHTML = days.map((d,i) => {
    const h = Math.max(3, Math.round((totals[i]/max)*140));
    const label = d.toLocaleDateString("en-IN",{weekday:"short"});
    return `<div class="bar-col"><div class="bar-fill" style="height:${h}px" data-val="${fmt(totals[i])}"></div><span class="bar-label">${label}</span></div>`;
  }).join("");
}

/* ================= BILLING / POS ================= */
function renderBilling(){
  $("#posCategoryChips").innerHTML = ["", ...CATEGORIES].map(c => `
    <button class="cat-chip${posCategory===c?" active":""}" data-cat="${esc(c)}">${c ? esc(c) : "All"}</button>
  `).join("");
  renderPosGrid();
  renderCustomerSelect();
  renderCart();
}
function renderPosGrid(){
  const term = posSearchTerm.trim().toLowerCase();
  const list = state.products.filter(p => {
    if(posCategory && p.category !== posCategory) return false;
    if(term && !(p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))) return false;
    return true;
  });
  const grid = $("#posProductGrid");
  if(!list.length){ grid.innerHTML = `<p class="empty-note">No products match your search.</p>`; return; }
  grid.innerHTML = list.map(p => `
    <button class="product-card${p.stock<=0?" out":""}" data-id="${p.id}">
      ${isLow(p) && p.stock>0 ? `<span class="pc-badge">Low</span>` : ""}
      <div class="pc-thumb" style="background:#${CATEGORY_BG[p.category]||"E7EBDC"}">${esc(p.category.charAt(0))}</div>
      <div class="pc-name">${esc(p.name)}</div>
      <div class="pc-price">${fmt(p.price)}</div>
      <div class="pc-stock${isLow(p)?" low":""}">${p.stock<=0?"Out of stock":p.stock+" in stock"}</div>
    </button>
  `).join("");
}
function renderCustomerSelect(){
  const sel = $("#cartCustomer");
  const current = sel.value;
  sel.innerHTML = `<option value="">Walk-in Customer</option>` + state.customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  if(current) sel.value = current;
}
function addToCart(id){
  const p = productById(id);
  if(!p || p.stock<=0) return;
  const line = cart.find(c => c.id === p.id);
  const inCart = line ? line.qty : 0;
  if(inCart >= p.stock){ toast("No more stock available for " + p.name); return; }
  if(line) line.qty++;
  else cart.push({ id: p.id, name: p.name, price: p.price, category: p.category, sku: p.sku, qty: 1 });
  renderCart();
}
function changeQty(id, delta){
  const line = cart.find(c => c.id === id);
  if(!line) return;
  const p = productById(id);
  const next = line.qty + delta;
  if(next <= 0){ cart = cart.filter(c => c.id !== id); }
  else if(p && next > p.stock){ toast("Only " + p.stock + " in stock"); }
  else line.qty = next;
  renderCart();
}
function renderCart(){
  const list = $("#cartList");
  if(!cart.length){
    list.innerHTML = `<p class="empty-note">Cart is empty. Tap a product to add it.</p>`;
  } else {
    list.innerHTML = cart.map(c => `
      <div class="cart-row" data-id="${c.id}">
        <div class="cart-info"><strong>${esc(c.name)}</strong><small>${esc(c.sku)} · ${fmt(c.price)}</small></div>
        <div class="qty-control">
          <button class="qty-btn" data-act="dec" data-id="${c.id}">−</button>
          <span class="qty-val">${c.qty}</span>
          <button class="qty-btn" data-act="inc" data-id="${c.id}">+</button>
        </div>
        <button class="cart-remove" data-act="rm" data-id="${c.id}" title="Remove">&times;</button>
      </div>
    `).join("");
  }
  const subtotal = cart.reduce((s,c)=>s+c.price*c.qty,0);
  const tax = Math.round(subtotal*TAX_RATE*100)/100;
  const total = Math.round((subtotal+tax)*100)/100;
  const count = cart.reduce((s,c)=>s+c.qty,0);
  $("#cartCount").textContent = count + " item" + (count!==1?"s":"");
  $("#cartSubtotal").textContent = fmt(subtotal);
  $("#cartTax").textContent = fmt(tax);
  $("#cartTotal").textContent = fmt(total);
  const btn = $("#checkoutBtn");
  btn.disabled = cart.length===0;
  btn.textContent = "Charge " + fmt(total);
}
function checkout(){
  if(!cart.length) return;
  const items = cart.map(c => ({ productId: c.id, name: c.name, price: c.price, qty: c.qty, category: c.category, sku: c.sku }));
  const subtotal = items.reduce((s,i)=>s+i.price*i.qty,0);
  const tax = Math.round(subtotal*TAX_RATE*100)/100;
  const total = Math.round((subtotal+tax)*100)/100;
  const custVal = $("#cartCustomer").value;
  const tx = {
    id: state.nextTxId++,
    time: new Date().toISOString(),
    items, subtotal, tax, total,
    customerId: custVal ? Number(custVal) : null,
    payMethod
  };
  items.forEach(i => { const p = productById(i.productId); if(p) p.stock = Math.max(0, p.stock - i.qty); });
  state.transactions.push(tx);
  saveState();
  cart = [];
  renderCart();
  renderPosGrid();
  showReceipt(tx);
  toast("Bill #" + tx.id + " charged — " + fmt(total));
}
function showReceipt(tx){
  const cust = customerById(tx.customerId);
  $("#receiptBody").innerHTML = `
    <div class="receipt-head"><strong>DMart</strong><small>Store Console · Register 1</small></div>
    <div class="receipt-meta">
      <div><span>Bill No.</span><span>#${tx.id}</span></div>
      <div><span>Date</span><span>${fmtTime(tx.time)}</span></div>
      <div><span>Customer</span><span>${esc(cust?cust.name:"Walk-in")}</span></div>
      <div><span>Payment</span><span>${esc(tx.payMethod)}</span></div>
    </div>
    <div class="receipt-items">
      ${tx.items.map(i => `<div class="receipt-item"><span>${esc(i.name)} × ${i.qty}</span><span>${fmt(i.price*i.qty)}</span></div>`).join("")}
    </div>
    <div class="receipt-totals">
      <div class="row"><span>Subtotal</span><span>${fmt(tx.subtotal)}</span></div>
      <div class="row"><span>Tax (5%)</span><span>${fmt(tx.tax)}</span></div>
      <div class="row grand"><span>Total</span><span>${fmt(tx.total)}</span></div>
    </div>
    <div class="receipt-foot">Thank you for shopping with us!</div>
  `;
  $("#receiptBackdrop").classList.add("show");
}

/* ================= INVENTORY ================= */
function renderInventory(){
  const catSel = $("#invCategoryFilter");
  if(!catSel.dataset.filled){
    catSel.innerHTML = `<option value="">All categories</option>` + CATEGORIES.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
    catSel.dataset.filled = "1";
  }
  const term = invSearchTerm.trim().toLowerCase();
  let list = state.products.filter(p => {
    if(invCategoryTerm && p.category !== invCategoryTerm) return false;
    if(term && !(p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))) return false;
    return true;
  });
  list.sort((a,b)=>a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(list.length/PAGE_SIZE));
  invPage = Math.min(invPage, pages);
  const pageItems = list.slice((invPage-1)*PAGE_SIZE, invPage*PAGE_SIZE);

  $("#invTableBody").innerHTML = pageItems.length ? pageItems.map(p => `
    <tr>
      <td><div class="prod-cell">${thumb(p.category)}<span>${esc(p.name)}</span></div></td>
      <td><span style="font-family:var(--font-mono);font-size:12px;">${esc(p.sku)}</span></td>
      <td>${esc(p.category)}</td>
      <td>${fmt(p.price)}</td>
      <td>${p.stock}</td>
      <td>${isLow(p) ? `<span class="badge badge--low">Low stock</span>` : `<span class="badge badge--ok">In stock</span>`}</td>
      <td><div class="row-actions"><button data-act="edit-prod" data-id="${p.id}">Edit</button><button data-act="del-prod" data-id="${p.id}">Delete</button></div></td>
    </tr>
  `).join("") : `<tr><td colspan="7"><p class="empty-note">No products match your search.</p></td></tr>`;

  renderPagination("#invPagination", invPage, pages, (p)=>{ invPage=p; renderInventory(); });
}
function renderPagination(sel, page, pages, onGo){
  const el = $(sel);
  if(pages<=1){ el.innerHTML=""; return; }
  let html = `<button data-page="${page-1}" ${page===1?"disabled":""}>‹</button>`;
  for(let i=1;i<=pages;i++){
    if(pages>7 && i!==1 && i!==pages && Math.abs(i-page)>1){ if(i===2||i===pages-1) html+=`<span style="padding:0 4px;color:var(--ink-soft);">…</span>`; continue; }
    html += `<button data-page="${i}" class="${i===page?"active":""}">${i}</button>`;
  }
  html += `<button data-page="${page+1}" ${page===pages?"disabled":""}>›</button>`;
  el.innerHTML = html;
  $$("button[data-page]", el).forEach(b => b.addEventListener("click", () => {
    const p = Number(b.dataset.page);
    if(p>=1 && p<=pages) onGo(p);
  }));
}
function openProductModal(id){
  editingProductId = id || null;
  const p = id ? productById(id) : null;
  $("#genericModalTitle").textContent = p ? "Edit Product" : "Add Product";
  $("#genericModalBody").innerHTML = `
    <div class="form-row"><label>Product name</label><input id="fProdName" type="text" value="${p?esc(p.name):""}" placeholder="e.g. Basmati Rice 5kg"></div>
    <div class="form-grid">
      <div class="form-row"><label>Category</label><select id="fProdCat">${CATEGORIES.map(c=>`<option value="${esc(c)}" ${p&&p.category===c?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
      <div class="form-row"><label>SKU</label><input id="fProdSku" type="text" value="${p?esc(p.sku):""}" placeholder="auto if blank"></div>
      <div class="form-row"><label>Price (₹)</label><input id="fProdPrice" type="number" min="0" step="0.5" value="${p?p.price:""}"></div>
      <div class="form-row"><label>Stock</label><input id="fProdStock" type="number" min="0" step="1" value="${p?p.stock:""}"></div>
      <div class="form-row"><label>Reorder level</label><input id="fProdReorder" type="number" min="0" step="1" value="${p?p.reorder:10}"></div>
    </div>
    <p class="form-error" id="fProdError"></p>
    <div class="form-actions">
      <button class="btn btn-ghost" id="fProdCancel">Cancel</button>
      <button class="btn btn-primary" id="fProdSave">${p?"Save Changes":"Add Product"}</button>
    </div>
  `;
  $("#genericBackdrop").classList.add("show");
  $("#fProdCancel").addEventListener("click", closeGenericModal);
  $("#fProdSave").addEventListener("click", saveProduct);
}
function saveProduct(){
  const name = $("#fProdName").value.trim();
  const category = $("#fProdCat").value;
  let sku = $("#fProdSku").value.trim();
  const price = Number($("#fProdPrice").value);
  const stock = Number($("#fProdStock").value);
  const reorder = Number($("#fProdReorder").value);
  const err = $("#fProdError");
  if(!name || !category || isNaN(price) || price<0 || isNaN(stock) || stock<0 || isNaN(reorder) || reorder<0){
    err.textContent = "Please fill in every field with valid values."; err.classList.add("show"); return;
  }
  if(!sku) sku = (CATALOG_DEF[category]?.code || "GEN") + "-" + Math.floor(1000+Math.random()*8999);
  if(editingProductId){
    const p = productById(editingProductId);
    Object.assign(p, { name, category, sku, price, stock, reorder });
    toast("Product updated");
  } else {
    state.products.push({ id: state.nextProdId++, name, category, sku, price, stock, reorder });
    toast("Product added");
  }
  saveState();
  closeGenericModal();
  renderInventory();
  if(currentView==="billing") renderPosGrid();
  if(currentView==="dashboard") renderDashboard();
}
function confirmDeleteProduct(id){
  const p = productById(id);
  if(!p) return;
  $("#genericModalTitle").textContent = "Delete Product";
  $("#genericModalBody").innerHTML = `
    <p class="confirm-text">Remove <strong>${esc(p.name)}</strong> (${esc(p.sku)}) from your catalog? Past bills that included it are not affected.</p>
    <div class="form-actions"><button class="btn btn-ghost" id="delProdCancel">Cancel</button><button class="btn btn-danger" id="delProdConfirm">Delete</button></div>
  `;
  $("#genericBackdrop").classList.add("show");
  $("#delProdCancel").addEventListener("click", closeGenericModal);
  $("#delProdConfirm").addEventListener("click", () => {
    state.products = state.products.filter(x => x.id !== id);
    saveState();
    closeGenericModal();
    renderInventory();
    if(currentView==="billing") renderPosGrid();
    toast("Product deleted");
  });
}

/* ================= CUSTOMERS ================= */
function customerStats(id){
  const tx = state.transactions.filter(t => t.customerId === id);
  const spend = tx.reduce((s,t)=>s+t.total,0);
  const last = tx.length ? tx.reduce((a,b)=> new Date(a.time)>new Date(b.time)?a:b).time : null;
  return { visits: tx.length, spend, last };
}
function renderCustomers(){
  const term = custSearchTerm.trim().toLowerCase();
  let list = state.customers.filter(c => !term || c.name.toLowerCase().includes(term) || c.phone.includes(term));
  list.sort((a,b)=>a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(list.length/PAGE_SIZE));
  custPage = Math.min(custPage, pages);
  const pageItems = list.slice((custPage-1)*PAGE_SIZE, custPage*PAGE_SIZE);

  $("#custTableBody").innerHTML = pageItems.length ? pageItems.map(c => {
    const stats = customerStats(c.id);
    return `<tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td><span style="font-family:var(--font-mono);font-size:12px;">${esc(c.phone)}</span></td>
      <td>${esc(c.email||"—")}</td>
      <td>${stats.visits}</td>
      <td>${fmt(stats.spend)}</td>
      <td>${stats.last ? fmtTime(stats.last) : "—"}</td>
      <td><div class="row-actions"><button data-act="edit-cust" data-id="${c.id}">Edit</button><button data-act="del-cust" data-id="${c.id}">Delete</button></div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="7"><p class="empty-note">No customers match your search.</p></td></tr>`;

  renderPagination("#custPagination", custPage, pages, (p)=>{ custPage=p; renderCustomers(); });
}
function openCustomerModal(id){
  editingCustomerId = id || null;
  const c = id ? customerById(id) : null;
  $("#genericModalTitle").textContent = c ? "Edit Customer" : "Add Customer";
  $("#genericModalBody").innerHTML = `
    <div class="form-row"><label>Full name</label><input id="fCustName" type="text" value="${c?esc(c.name):""}" placeholder="e.g. Rahul Singh"></div>
    <div class="form-row"><label>Phone</label><input id="fCustPhone" type="text" value="${c?esc(c.phone):""}" placeholder="98xxx xxxxx"></div>
    <div class="form-row"><label>Email (optional)</label><input id="fCustEmail" type="email" value="${c?esc(c.email||""):""}" placeholder="name@example.com"></div>
    <p class="form-error" id="fCustError"></p>
    <div class="form-actions">
      <button class="btn btn-ghost" id="fCustCancel">Cancel</button>
      <button class="btn btn-primary" id="fCustSave">${c?"Save Changes":"Add Customer"}</button>
    </div>
  `;
  $("#genericBackdrop").classList.add("show");
  $("#fCustCancel").addEventListener("click", closeGenericModal);
  $("#fCustSave").addEventListener("click", saveCustomer);
}
function saveCustomer(){
  const name = $("#fCustName").value.trim();
  const phone = $("#fCustPhone").value.trim();
  const email = $("#fCustEmail").value.trim();
  const err = $("#fCustError");
  if(!name || !phone){ err.textContent = "Name and phone are required."; err.classList.add("show"); return; }
  if(editingCustomerId){
    const c = customerById(editingCustomerId);
    Object.assign(c, { name, phone, email });
    toast("Customer updated");
  } else {
    state.customers.push({ id: state.nextCustId++, name, phone, email });
    toast("Customer added");
  }
  saveState();
  closeGenericModal();
  renderCustomers();
  if(currentView==="billing") renderCustomerSelect();
}
function confirmDeleteCustomer(id){
  const c = customerById(id);
  if(!c) return;
  $("#genericModalTitle").textContent = "Delete Customer";
  $("#genericModalBody").innerHTML = `
    <p class="confirm-text">Remove <strong>${esc(c.name)}</strong> from your directory? Their past bills stay on record.</p>
    <div class="form-actions"><button class="btn btn-ghost" id="delCustCancel">Cancel</button><button class="btn btn-danger" id="delCustConfirm">Delete</button></div>
  `;
  $("#genericBackdrop").classList.add("show");
  $("#delCustCancel").addEventListener("click", closeGenericModal);
  $("#delCustConfirm").addEventListener("click", () => {
    state.customers = state.customers.filter(x => x.id !== id);
    saveState();
    closeGenericModal();
    renderCustomers();
    if(currentView==="billing") renderCustomerSelect();
    toast("Customer deleted");
  });
}

/* ================= REPORTS ================= */
function renderReports(){
  const tx = txInRange(reportRange);
  const totalSales = tx.reduce((s,t)=>s+t.total,0);
  const itemsSold = tx.reduce((s,t)=>s+t.items.reduce((a,i)=>a+i.qty,0),0);
  const avgBill = tx.length ? totalSales/tx.length : 0;

  $("#reportTickets").innerHTML = [
    ["Total Sales", fmt(totalSales), "in selected range"],
    ["Total Bills", tx.length, "transactions"],
    ["Avg. Bill Value", fmt(avgBill), "per transaction"],
    ["Items Sold", itemsSold, "units across all bills"]
  ].map(([label,val,sub]) => `<div class="ticket"><small>${esc(label)}</small><strong>${val}</strong><span>${esc(sub)}</span></div>`).join("");

  const byProduct = {};
  const byCategory = {};
  tx.forEach(t => t.items.forEach(i => {
    if(!byProduct[i.name]) byProduct[i.name] = { qty:0, revenue:0, category:i.category };
    byProduct[i.name].qty += i.qty; byProduct[i.name].revenue += i.price*i.qty;
    byCategory[i.category] = (byCategory[i.category]||0) + i.price*i.qty;
  }));
  const topProducts = Object.entries(byProduct).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,8);
  $("#topProductsLedger").innerHTML = topProducts.length ? topProducts.map(([name,d],idx) => `
    <div class="ledger-row">
      ${thumb(d.category)}
      <div class="ledger-main"><strong>${esc(name)}</strong><small>${d.qty} units sold</small></div>
      <div class="ledger-value"><strong>${fmt(d.revenue)}</strong>#${idx+1}</div>
    </div>
  `).join("") : `<p class="empty-note">No sales in this range yet.</p>`;

  const catEntries = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
  const maxCat = Math.max(...catEntries.map(e=>e[1]), 1);
  $("#categoryChart").innerHTML = catEntries.length ? catEntries.map(([cat,val]) => `
    <div class="hbar-row"><div class="hbar-label">${esc(cat)}</div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(val/maxCat*100)}%"></div></div><div class="hbar-val">${fmt(val)}</div></div>
  `).join("") : `<p class="empty-note">No sales in this range yet.</p>`;
}

/* ================= MODALS / MISC ================= */
function closeGenericModal(){ $("#genericBackdrop").classList.remove("show"); editingProductId=null; editingCustomerId=null; }
function closeReceiptModal(){ $("#receiptBackdrop").classList.remove("show"); }

function resetStoreData(){
  $("#genericModalTitle").textContent = "Reset Store Data";
  $("#genericModalBody").innerHTML = `
    <p class="confirm-text">This clears every bill you've rung up and restores the original catalog stock levels and customer directory. This can't be undone.</p>
    <div class="form-actions"><button class="btn btn-ghost" id="resetCancel">Cancel</button><button class="btn btn-danger" id="resetConfirm">Reset everything</button></div>
  `;
  $("#genericBackdrop").classList.add("show");
  $("#resetCancel").addEventListener("click", closeGenericModal);
  $("#resetConfirm").addEventListener("click", () => {
    state.products = buildCatalog();
    state.customers = buildCustomers();
    state.transactions = [];
    state.nextTxId = 1;
    state.nextCustId = state.customers.length+1;
    state.nextProdId = state.products.length+1;
    cart = [];
    saveState();
    closeGenericModal();
    switchView(currentView);
    toast("Store data reset");
  });
}

/* ================= GLOBAL SEARCH ================= */
function renderGlobalSearch(term){
  const box = $("#searchResults");
  if(!term.trim()){ box.classList.remove("show"); box.innerHTML=""; return; }
  const t = term.trim().toLowerCase();
  const matches = state.products.filter(p => p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)).slice(0,8);
  box.innerHTML = matches.length ? matches.map(p => `
    <div class="sr-item" data-id="${p.id}">
      <div class="sr-thumb" style="background:#${CATEGORY_BG[p.category]||"E7EBDC"};border-radius:6px;"></div>
      <div class="sr-info"><strong>${esc(p.name)}</strong><small>${esc(p.sku)} · ${fmt(p.price)} · ${p.stock} in stock</small></div>
    </div>
  `).join("") : `<div class="sr-empty">No products found for "${esc(term)}"</div>`;
  box.classList.add("show");
}

/* ================= EVENT WIRING ================= */
function wireEvents(){
  $$(".nav-item").forEach(b => b.addEventListener("click", () => switchView(b.dataset.view)));
  $("#quickBillBtn").addEventListener("click", () => switchView("billing"));
  $("#hamburger").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#sidebarBackdrop").classList.add("show"); });
  $("#sidebarBackdrop").addEventListener("click", closeSidebar);
  $("#resetDataBtn").addEventListener("click", resetStoreData);

  $("#globalSearch").addEventListener("input", e => renderGlobalSearch(e.target.value));
  $("#globalSearch").addEventListener("blur", () => setTimeout(()=>$("#searchResults").classList.remove("show"), 150));
  $("#searchResults").addEventListener("click", e => {
    const row = e.target.closest(".sr-item");
    if(!row) return;
    addToCart(Number(row.dataset.id));
    switchView("billing");
    $("#globalSearch").value = "";
    $("#searchResults").classList.remove("show");
    toast("Added to bill");
  });

  $("#fullscreenBtn").addEventListener("click", () => {
    if(!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  document.addEventListener("fullscreenchange", () => {
    const on = !!document.fullscreenElement;
    $("#fsExpandIcon").style.display = on ? "none" : "";
    $("#fsCompressIcon").style.display = on ? "" : "none";
  });

  // Billing
  $("#posCategoryChips").addEventListener("click", e => {
    const b = e.target.closest(".cat-chip"); if(!b) return;
    posCategory = b.dataset.cat; renderBilling();
  });
  $("#posSearch").addEventListener("input", e => { posSearchTerm = e.target.value; renderPosGrid(); });
  $("#posProductGrid").addEventListener("click", e => {
    const card = e.target.closest(".product-card"); if(!card) return;
    addToCart(Number(card.dataset.id));
  });
  $("#cartList").addEventListener("click", e => {
    const btn = e.target.closest("button"); if(!btn) return;
    const id = Number(btn.dataset.id);
    if(btn.dataset.act==="inc") changeQty(id, 1);
    if(btn.dataset.act==="dec") changeQty(id, -1);
    if(btn.dataset.act==="rm") { cart = cart.filter(c=>c.id!==id); renderCart(); }
  });
  $("#payMethods").addEventListener("click", e => {
    const b = e.target.closest(".pay-btn"); if(!b) return;
    payMethod = b.dataset.method;
    $$(".pay-btn").forEach(x=>x.classList.toggle("active", x===b));
  });
  $("#checkoutBtn").addEventListener("click", checkout);
  $("#clearCartBtn").addEventListener("click", () => { cart=[]; renderCart(); });
  $("#receiptClose").addEventListener("click", closeReceiptModal);
  $("#receiptBackdrop").addEventListener("click", e => { if(e.target.id==="receiptBackdrop") closeReceiptModal(); });
  $("#printReceiptBtn").addEventListener("click", () => window.print());

  // Inventory
  $("#invSearch").addEventListener("input", e => { invSearchTerm = e.target.value; invPage=1; renderInventory(); });
  $("#invCategoryFilter").addEventListener("change", e => { invCategoryTerm = e.target.value; invPage=1; renderInventory(); });
  $("#addProductBtn").addEventListener("click", () => openProductModal(null));
  $("#invTableBody").addEventListener("click", e => {
    const btn = e.target.closest("button"); if(!btn) return;
    const id = Number(btn.dataset.id);
    if(btn.dataset.act==="edit-prod") openProductModal(id);
    if(btn.dataset.act==="del-prod") confirmDeleteProduct(id);
  });

  // Customers
  $("#custSearch").addEventListener("input", e => { custSearchTerm = e.target.value; custPage=1; renderCustomers(); });
  $("#addCustomerBtn").addEventListener("click", () => openCustomerModal(null));
  $("#custTableBody").addEventListener("click", e => {
    const btn = e.target.closest("button"); if(!btn) return;
    const id = Number(btn.dataset.id);
    if(btn.dataset.act==="edit-cust") openCustomerModal(id);
    if(btn.dataset.act==="del-cust") confirmDeleteCustomer(id);
  });

  // Reports
  $("#reportRangeChips").addEventListener("click", e => {
    const b = e.target.closest(".range-chip"); if(!b) return;
    reportRange = b.dataset.range;
    $$(".range-chip").forEach(x=>x.classList.toggle("active", x===b));
    renderReports();
  });

  // Generic modal
  $("#genericModalClose").addEventListener("click", closeGenericModal);
  $("#genericBackdrop").addEventListener("click", e => { if(e.target.id==="genericBackdrop") closeGenericModal(); });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape"){ closeGenericModal(); closeReceiptModal(); }
  });
}

/* ================= CLOCK ================= */
function tickClock(){
  const el = $("#shiftClock");
  if(el) el.textContent = new Date().toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"});
}

/* ================= BOOT ================= */
function boot(){
  initState();
  wireEvents();
  switchView("dashboard");
  tickClock();
  setInterval(tickClock, 30000);

  const fill = $("#bootFill");
  requestAnimationFrame(() => { fill.style.width = "100%"; });
  setTimeout(() => { $("#bootScreen").classList.add("hide"); }, 380);
}

if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
