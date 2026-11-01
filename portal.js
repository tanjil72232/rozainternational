// ROZA INTERNATIONAL - Dedicated Customer Order Portal Script
const SB_URL = 'https://secvddpmfkudsahdkgfx.supabase.co';
const SB_KEY = 'sb_publishable_9OXdSbpr3mrb5QqYK29oog_ugQ53GMh';

let currentCustomer = null;
let customerOrders = [];
let allCustomers = [];
let allProducts = [];
let allSuppliers = [];
let searchQuery = '';
let activeSection = 'ALL'; // 'ALL', 'Pending', 'In Production', 'Shipped', 'Delivered', 'DeliveredPaid', 'Cancelled'
let currentViewingOrderId = null;

// Company info for invoice/memo
const COMPANY = {
    name: 'ROZA INTERNATIONAL',
    address: '49/1/B, Purana Paltan Lane, Dhaka, Bangladesh',
    phone: '+880 1970 026390',
    email: 'tanjil@rozainternational.com',
    website: 'www.rozainternational.com'
};

// Section Definitions (Faithful 1:1 replica of Mac OrdersView SECTIONS)
const SECTIONS = [
    {
        id: 'Pending',
        label: 'Pending Orders',
        icon: 'clock',
        accent: 'text-amber-700 bg-amber-50 border-amber-200',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        indicator: 'bg-amber-500',
        headerBg: 'bg-amber-500/10 border-b border-amber-200/70',
        idBadge: 'bg-amber-100 text-amber-900 border border-amber-300',
    },
    {
        id: 'In Production',
        label: 'In Production / Confirmed',
        icon: 'check-circle-2',
        accent: 'text-teal-700 bg-teal-50 border-teal-200',
        badgeBg: 'bg-teal-100 text-teal-800 border-teal-300',
        indicator: 'bg-teal-500',
        headerBg: 'bg-teal-500/10 border-b border-teal-200/70',
        idBadge: 'bg-teal-100 text-teal-900 border border-teal-300',
    },
    {
        id: 'Shipped',
        label: 'Shipped Orders',
        icon: 'ship',
        accent: 'text-sky-700 bg-sky-50 border-sky-200',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
        indicator: 'bg-sky-500',
        headerBg: 'bg-sky-500/10 border-b border-sky-200/70',
        idBadge: 'bg-sky-100 text-sky-900 border border-sky-300',
    },
    {
        id: 'Delivered',
        label: 'Delivered (Pending Commission)',
        icon: 'truck',
        accent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        indicator: 'bg-emerald-500',
        headerBg: 'bg-emerald-500/10 border-b border-emerald-200/70',
        idBadge: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
    },
    {
        id: 'DeliveredPaid',
        label: 'Delivered (Completed & Paid)',
        icon: 'check-circle',
        accent: 'text-purple-700 bg-purple-50 border-purple-200',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
        indicator: 'bg-purple-500',
        headerBg: 'bg-purple-500/10 border-b border-purple-200/70',
        idBadge: 'bg-purple-100 text-purple-900 border border-purple-300',
    },
    {
        id: 'Cancelled',
        label: 'Cancelled Orders',
        icon: 'ban',
        accent: 'text-rose-700 bg-rose-50 border-rose-200',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
        indicator: 'bg-rose-500',
        headerBg: 'bg-rose-500/10 border-b border-rose-200/70',
        idBadge: 'bg-rose-100 text-rose-900 border border-rose-300',
    }
];

function openCustomerPortalModal() {
    window.location.href = '/order/';
}

function closeCustomerPortalModal() {
    window.location.href = '/';
}

function customerPortalLogout() {
    currentCustomer = null;
    customerOrders = [];
    currentViewingOrderId = null;
    sessionStorage.removeItem('roza_portal_cust');
    const headerLogout = document.getElementById('portalHeaderLogoutBtn');
    if (headerLogout) headerLogout.classList.add('hidden');
    renderPortalLogin();
}

function renderPortalLogin() {
    const content = document.getElementById('customerPortalBody');
    if (!content) return;
    content.innerHTML = `
        <div class="max-w-md mx-auto py-6 sm:py-10">
            <div class="text-center mb-6">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100 shadow-xs">
                    <i data-lucide="shield-check" class="w-7 h-7"></i>
                </div>
                <h3 class="text-xl sm:text-2xl font-bold text-gray-900 font-display">Client Order Portal</h3>
                <p class="text-xs sm:text-sm text-gray-500 mt-1">Log in with your Phone Number or Email & Password assigned by Roza International.</p>
            </div>

            <form id="portalLoginForm" onsubmit="handlePortalLogin(event)" class="bg-gray-50 p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Phone Number or Email</label>
                    <div class="relative">
                        <input type="text" id="portalIdentifier" required placeholder="e.g. 01711... or buyer@company.com" 
                               class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Portal Password</label>
                    <div class="relative">
                        <input type="password" id="portalPassword" required placeholder="Enter your portal password" 
                               class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white">
                    </div>
                </div>

                <div id="portalLoginError" class="hidden text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-center"></div>

                <button type="submit" id="portalLoginBtn" class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2">
                    <i data-lucide="log-in" class="w-4 h-4"></i>
                    <span>Log In to View Orders</span>
                </button>

                <p class="text-[11px] text-gray-400 text-center pt-2">
                    Need help logging in? Please contact Roza International support desk via WhatsApp or Call at +880 1970 026390.
                </p>
            </form>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

async function handlePortalLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('portalLoginBtn');
    const errBox = document.getElementById('portalLoginError');
    const identifier = document.getElementById('portalIdentifier').value.trim();
    const password = document.getElementById('portalPassword').value.trim();

    if (errBox) errBox.classList.add('hidden');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> Checking credentials...`;
    }

    try {
        const res = await fetch(`${SB_URL}/rest/v1/app_data?key=eq.agent_customers&select=data`, {
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
        });
        const rows = await res.json();
        const customers = (Array.isArray(rows) && rows[0]?.data) ? rows[0].data : [];

        const cleanIdent = identifier.toLowerCase().replace(/[^a-z0-9@.]/g, '');
        const inputNum = identifier.replace(/[^0-9]/g, '');

        const matchingCustomers = customers.filter(c => {
            const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
            const cEmail = (c.email || '').toLowerCase().trim();
            const phoneMatch = inputNum.length >= 6 && (cPhone.endsWith(inputNum) || inputNum.endsWith(cPhone));
            const emailMatch = cleanIdent.includes('@') && cEmail && cEmail === cleanIdent;
            return phoneMatch || emailMatch;
        });

        if (matchingCustomers.length === 0) {
            throw new Error('No customer account found with this phone number or email.');
        }

        let found = matchingCustomers.find(c => Boolean(c.portal_enabled) && String(c.portal_password).trim() === password);
        
        if (!found) {
            const enabledOne = matchingCustomers.find(c => Boolean(c.portal_enabled));
            if (!enabledOne) {
                throw new Error('Portal access is not enabled for your account. Please contact Roza International support.');
            }
            if (String(enabledOne.portal_password).trim() !== password) {
                throw new Error('Incorrect portal password. Please check and try again.');
            }
            found = enabledOne;
        }

        currentCustomer = found;
        sessionStorage.setItem('roza_portal_cust', JSON.stringify(found));
        const headerLogout = document.getElementById('portalHeaderLogoutBtn');
        if (headerLogout) headerLogout.classList.remove('hidden');
        
        requestNotificationPermission();
        await renderPortalDashboard();
    } catch (err) {
        if (errBox) {
            errBox.textContent = err.message || 'Login failed';
            errBox.classList.remove('hidden');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="log-in" class="w-4 h-4 mr-1"></i> Log In to View Orders`;
            if (window.lucide) lucide.createIcons();
        }
    }
}

function requestNotificationPermission() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
    }
}

function triggerBrowserNotification(title, body) {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
            new Notification(title, { body, icon: '/static/favicon.ico' });
        } catch (e) {}
    }
}

async function renderPortalDashboard() {
    const content = document.getElementById('customerPortalBody');
    if (!content) return;

    content.innerHTML = `
        <div class="py-16 text-center">
            <div class="inline-block animate-spin text-3xl mb-3">⏳</div>
            <p class="text-sm font-semibold text-gray-700">Loading orders & shipments securely...</p>
        </div>
    `;

    try {
        const [ordersRes, prodsRes, suppsRes, custsRes] = await Promise.all([
            fetch(`${SB_URL}/rest/v1/app_data?key=eq.agent_orders&select=data`, {
                headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
            }),
            fetch(`${SB_URL}/rest/v1/app_data?key=eq.agent_products&select=data`, {
                headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
            }),
            fetch(`${SB_URL}/rest/v1/app_data?key=eq.agent_suppliers&select=data`, {
                headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
            }),
            fetch(`${SB_URL}/rest/v1/app_data?key=eq.agent_customers&select=data`, {
                headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
            })
        ]);

        const [orderRows, prodRows, suppRows, custRows] = await Promise.all([
            ordersRes.json(),
            prodsRes.json(),
            suppsRes.json(),
            custsRes.json()
        ]);

        const allOrders = (Array.isArray(orderRows) && orderRows[0]?.data) ? orderRows[0].data : [];
        allProducts = (Array.isArray(prodRows) && prodRows[0]?.data) ? prodRows[0].data : [];
        allSuppliers = (Array.isArray(suppRows) && suppRows[0]?.data) ? suppRows[0].data : [];
        allCustomers = (Array.isArray(custRows) && custRows[0]?.data) ? custRows[0].data : [];

        // Support direct customer matching OR Different Factory / Sister Concern shared order matching
        customerOrders = allOrders.filter(o => {
            if (o.portal_visible === false) return false;
            const isDirectCustomer = Number(o.customer_id) === Number(currentCustomer.id);
            const isSharedPortalCustomer = o.portal_customer_id && Number(o.portal_customer_id) === Number(currentCustomer.id);
            return isDirectCustomer || isSharedPortalCustomer;
        }).sort((a, b) => (b.order_date || '').localeCompare(a.order_date || ''));

        const headerLogout = document.getElementById('portalHeaderLogoutBtn');
        if (headerLogout) headerLogout.classList.remove('hidden');

        checkAndDispatchNotifications(customerOrders);
        handleRouteCheck();

    } catch (err) {
        content.innerHTML = `
            <div class="p-8 text-center text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
                <i data-lucide="alert-triangle" class="w-10 h-10 mx-auto mb-2 text-rose-500"></i>
                <p class="font-bold text-base">Failed to load orders</p>
                <p class="text-xs text-rose-700 mt-1">${err.message}</p>
                <button onclick="renderPortalDashboard()" class="mt-4 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs">Try Again</button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

// Helpers for calculations & labels
function getOrderActualQty(order) {
    if (order.status === 'Delivered' && Array.isArray(order.actual_items) && order.actual_items.length > 0) {
        return order.actual_items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0);
    }
    if (Array.isArray(order.items) && order.items.length > 0) {
        return order.items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0);
    }
    return parseFloat(order.total_quantity) || 0;
}

function getOrderTotalAmount(order) {
    const isDelivered = order.status === 'Delivered';
    const items = (isDelivered && order.actual_items?.length) ? order.actual_items : (order.items || []);
    if (!items.length) return 0;
    return items.reduce((sum, it) => {
        const q = parseFloat(it.quantity) || 0;
        let p = parseFloat(it.price) || 0;
        if (p === 0 && isDelivered) {
            const orig = (order.items || []).find(x => x.product_id === it.product_id);
            if (orig) p = parseFloat(orig.price) || 0;
        }
        return sum + (q * p);
    }, 0);
}

function getOrderCashback(order) {
    const rate = parseFloat(order.cashback_rate) || 0;
    if (rate === 0) return 0;
    const qty = getOrderActualQty(order);
    return rate * qty;
}

function getPartStatus(order, partNum) {
    if (order.status === 'Delivered') return 'Delivered';
    if (order.status === 'Cancelled') return 'Cancelled';
    if (partNum === 1) {
        if (order.part1_delivered) return 'Delivered';
        if (order.part1_shipped) return 'Shipped';
        return order.status || 'Pending';
    }
    if (partNum === 2) {
        if (order.part2_delivered) return 'Delivered';
        if (order.part2_shipped) return 'Shipped';
        return order.status || 'Pending';
    }
    return order.status || 'Pending';
}

function getOrderUrgency(order) {
    if (order.status !== 'Shipped') return { level: 0, text: '', diff: null };
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayDate = new Date(todayStr);
    todayDate.setHours(0, 0, 0, 0);

    const targetDate = order.etd_1 || order.etd;
    if (!targetDate) return { level: 0, text: '', diff: null };

    const etaDate = new Date(targetDate);
    etaDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((etaDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diff <= 0) return { level: 3, text: 'ETA Arrived / Overdue', diff };
    if (diff <= 7) return { level: 2, text: `${diff}D to ETA (Ship Approaching)`, diff };
    return { level: 1, text: `${diff}D to ETA`, diff };
}

function getShipmentAlerts(orders) {
    const alerts = [];
    orders.forEach(order => {
        if (order.status !== 'Shipped') return;
        const urgency = getOrderUrgency(order);
        if (urgency.level >= 2) {
            alerts.push({
                orderId: order.id,
                type: urgency.level === 3 ? 'danger' : 'warning',
                badge: urgency.text,
                days: urgency.diff,
                etaDate: order.etd_1 || order.etd,
                bl: order.bl1 || order.bl_no,
                part: 'Shipment',
                msg: urgency.level === 3 ? `Vessel arrived at port or reached ETA date!` : `Ship is approaching! Estimated arrival in ${urgency.diff} days.`
            });
        }
    });
    return alerts;
}

function checkAndDispatchNotifications(orders) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const knownKey = `roza_cust_${currentCustomer.id}_known_orders`;
    const knownRaw = localStorage.getItem(knownKey);
    const knownIds = knownRaw ? JSON.parse(knownRaw) : [];

    const newOrders = orders.filter(o => !knownIds.includes(o.id));
    if (newOrders.length > 0 && knownIds.length > 0) {
        newOrders.forEach(o => {
            triggerBrowserNotification(
                `🆕 New Order Assigned #${o.id}`,
                `A new indent order #${o.id} is now available in your portal (PI: ${o.pi1 || o.pi_no || 'Pending'}).`
            );
        });
    }
    localStorage.setItem(knownKey, JSON.stringify(orders.map(o => o.id)));

    const alerts = getShipmentAlerts(orders);
    alerts.forEach(a => {
        const notifKey = `ship_alert_${currentCustomer.id}_${a.orderId}_${todayStr}`;
        if (!localStorage.getItem(notifKey)) {
            localStorage.setItem(notifKey, '1');
            triggerBrowserNotification(
                a.days <= 0 ? `🚨 Shipment Arrival: Order #${a.orderId}` : `🚢 Ship Approaching: Order #${a.orderId}`,
                a.msg
            );
        }
    });
}

function handleRouteCheck() {
    const urlParams = new URLSearchParams(window.location.search);
    const piParam = urlParams.get('pi');
    const orderParam = urlParams.get('id');
    const hash = window.location.hash;

    let targetOrder = null;
    if (orderParam) {
        targetOrder = customerOrders.find(o => String(o.id) === String(orderParam));
    } else if (piParam) {
        targetOrder = customerOrders.find(o => 
            (o.pi1 && o.pi1.toLowerCase() === piParam.toLowerCase()) || 
            (o.pi2 && o.pi2.toLowerCase() === piParam.toLowerCase()) || 
            (o.pi_no && o.pi_no.toLowerCase() === piParam.toLowerCase())
        );
    } else if (hash.startsWith('#order-')) {
        const id = hash.replace('#order-', '');
        targetOrder = customerOrders.find(o => String(o.id) === String(id));
    }

    if (targetOrder) {
        navigateToOrderDetail(targetOrder.id);
    } else {
        renderOrdersList();
    }
}

function navigateToOrderDetail(orderId) {
    currentViewingOrderId = orderId;
    const order = customerOrders.find(o => o.id === orderId);
    if (!order) {
        renderOrdersList();
        return;
    }

    const piSlug = encodeURIComponent((order.pi1 || order.pi_no || `order-${order.id}`).replace(/\s+/g, '-'));
    window.history.pushState({ orderId }, '', `?pi=${piSlug}`);
    renderOrderDetailPage(order);
}

function navigateBackToOrdersList() {
    currentViewingOrderId = null;
    window.history.pushState({}, '', '/order/');
    renderOrdersList();
}

window.onpopstate = function() {
    handleRouteCheck();
};

function renderOrdersList() {
    const content = document.getElementById('customerPortalBody');
    if (!content) return;

    // Filter by search query (LC number, PI number, Order ID, Product, Supplier, Customer)
    const q = searchQuery.toLowerCase().trim();
    const filteredOrders = customerOrders.filter(order => {
        if (!q) return true;

        const customerName = (allCustomers.find(c => c.id === order.customer_id)?.name || '').toLowerCase();
        const supplierName = (allSuppliers.find(s => s.id === order.supplier_id)?.name || '').toLowerCase();
        const idMatch = String(order.id).includes(q);
        const lcMatch = (order.lc_no || '').toLowerCase().includes(q);
        const pi1Match = (order.pi1 || order.pi_no || '').toLowerCase().includes(q);
        const pi2Match = (order.pi2 || '').toLowerCase().includes(q);
        const blMatch = (order.bl1 || order.bl2 || order.bl_no || '').toLowerCase().includes(q);
        const prodMatch = (order.items || []).some(it => (it.product_name || '').toLowerCase().includes(q));

        return idMatch || lcMatch || pi1Match || pi2Match || blMatch || prodMatch || customerName.includes(q) || supplierName.includes(q);
    });

    // Grand totals
    const grandQty = customerOrders.reduce((sum, o) => sum + getOrderActualQty(o), 0);
    const grandAmount = customerOrders.reduce((sum, o) => sum + getOrderTotalAmount(o), 0);
    const grandCashback = customerOrders.reduce((sum, o) => sum + getOrderCashback(o), 0);
    const deliveredCount = customerOrders.filter(o => o.status === 'Delivered').length;

    // Shipment Notifications
    const shipmentAlerts = getShipmentAlerts(customerOrders);

    content.innerHTML = `
        <div class="space-y-5">
            <!-- Customer Welcome Header (Mac Suite Styling) -->
            <div class="bg-gradient-to-r from-navy-950 via-navy-900 to-brand-blue text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-navy-800 flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-gold/25 text-brand-gold border border-brand-gold/40">
                            <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Roza Client Suite
                        </span>
                        <span class="text-xs text-blue-200">#${currentCustomer.id}</span>
                    </div>
                    <h2 class="text-lg sm:text-2xl font-bold font-display truncate">${currentCustomer.name}</h2>
                    <p class="text-xs text-gray-300 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        ${currentCustomer.phone ? `<span>📞 ${currentCustomer.phone}</span>` : ''}
                        ${currentCustomer.email ? `<span>✉️ ${currentCustomer.email}</span>` : ''}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="renderPortalDashboard()" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 flex items-center gap-1.5 transition">
                        <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
                    </button>
                    <button onclick="customerPortalLogout()" class="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition">
                        <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Log Out
                    </button>
                </div>
            </div>

            <!-- Shipment Alerts Section -->
            ${shipmentAlerts.length > 0 ? `
                <div class="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 shadow-xs space-y-2">
                    <div class="flex items-center gap-2">
                        <div class="p-1.5 rounded-lg bg-amber-500 text-white animate-pulse">
                            <i data-lucide="bell-ring" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-xs sm:text-sm text-amber-950 font-display">Approaching Vessel Alerts (${shipmentAlerts.length})</h4>
                            <p class="text-[11px] text-amber-800">Live ETA notices for approaching container shipments</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
                        ${shipmentAlerts.map(alert => `
                            <div class="p-2.5 bg-white rounded-lg border ${alert.type === 'danger' ? 'border-rose-300 bg-rose-50/30' : 'border-amber-200'} flex items-center justify-between gap-2 text-xs">
                                <div class="min-w-0 pr-2">
                                    <div class="flex items-center gap-1.5">
                                        <span class="font-bold text-gray-900">Order #${alert.orderId}</span>
                                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${alert.type === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}">
                                            ${alert.badge}
                                        </span>
                                    </div>
                                    <p class="text-gray-700 text-[11px] truncate">${alert.msg}</p>
                                </div>
                                <button onclick="navigateToOrderDetail(${alert.orderId})" class="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] shrink-0">
                                    Open
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Summary KPI Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                    <p class="text-[10px] uppercase font-bold text-gray-400">Total Orders</p>
                    <p class="text-xl sm:text-2xl font-extrabold text-gray-900 mt-0.5">${customerOrders.length}</p>
                    <p class="text-[10px] text-gray-500">${deliveredCount} Delivered</p>
                </div>
                <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                    <p class="text-[10px] uppercase font-bold text-gray-400">Total Quantity</p>
                    <p class="text-xl sm:text-2xl font-extrabold text-blue-600 mt-0.5">${grandQty.toFixed(2)}</p>
                    <p class="text-[10px] text-gray-500">Metric Tons (MT)</p>
                </div>
                <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                    <p class="text-[10px] uppercase font-bold text-gray-400">Order Value</p>
                    <p class="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">$${grandAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p class="text-[10px] text-gray-500">USD Total</p>
                </div>
                <div class="bg-white p-3.5 rounded-xl border border-pink-100 bg-pink-50/20 shadow-2xs">
                    <p class="text-[10px] uppercase font-bold text-pink-700">Cashback</p>
                    <p class="text-xl sm:text-2xl font-extrabold text-pink-600 mt-0.5">$${grandCashback.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p class="text-[10px] text-pink-800">Total Cashback</p>
                </div>
            </div>

            <!-- Controls: Search & Section Tabs (Faithful to Mac App) -->
            <div class="space-y-2">
                <!-- Search Box -->
                <div class="relative">
                    <i data-lucide="search" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                    <input type="text" id="portalSearchInput" value="${searchQuery}" oninput="handleSearchChange(event)"
                           placeholder="Search by LC Number, PI Number, Supplier Name, Factory, or Product..." 
                           class="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white shadow-2xs">
                </div>

                <!-- Section Navigation Tabs (Exact replication of Mac App Tabs) -->
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button onclick="handleSectionTabChange('ALL')" 
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${activeSection === 'ALL' ? 'bg-navy-950 text-white shadow-2xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}">
                        <span>All Orders</span>
                        <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeSection === 'ALL' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}">${customerOrders.length}</span>
                    </button>
                    ${SECTIONS.map(sec => {
                        const count = customerOrders.filter(o => {
                            if (sec.id === 'Delivered') return o.status === 'Delivered';
                            if (sec.id === 'In Production') return o.status === 'In Production' || o.status === 'Confirmed';
                            return o.status === sec.id;
                        }).length;
                        return `
                            <button onclick="handleSectionTabChange('${sec.id}')" 
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${activeSection === sec.id ? 'bg-navy-950 text-white shadow-2xs' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}">
                                <span class="w-2 h-2 rounded-full ${sec.indicator}"></span>
                                <span>${sec.label}</span>
                                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeSection === sec.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}">${count}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Orders Section Groups (Exact Mac App UI Hierarchy) -->
            <div class="space-y-6">
                ${SECTIONS.map(section => {
                    if (activeSection !== 'ALL' && activeSection !== section.id) return '';
                    
                    const sectionOrders = filteredOrders.filter(o => {
                        if (section.id === 'Delivered') return o.status === 'Delivered';
                        if (section.id === 'In Production') return o.status === 'In Production' || o.status === 'Confirmed';
                        return o.status === section.id;
                    });

                    if (sectionOrders.length === 0) return '';

                    return `
                        <div>
                            <!-- Mac App Section Header Style -->
                            <div class="mb-2.5 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-2xs ${section.headerBg}">
                                        <i data-lucide="${section.icon}" class="w-3.5 h-3.5"></i>
                                        <span>${section.label}</span>
                                        <span class="ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${section.badgeBg}">${sectionOrders.length}</span>
                                    </span>
                                </div>
                                <div class="h-px flex-1 ml-3 bg-gray-200"></div>
                            </div>

                            <!-- List of Order Cards in this section -->
                            <div class="space-y-2.5">
                                ${sectionOrders.map(order => renderMacStyleOrderCard(order, section)).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}

                ${filteredOrders.length === 0 ? `
                    <div class="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500">
                        <i data-lucide="search-x" class="w-9 h-9 mx-auto text-gray-400 mb-2"></i>
                        <p class="font-bold text-xs sm:text-sm">No orders found matching your search</p>
                        ${searchQuery ? `
                            <button onclick="clearSearchFilters()" class="mt-2.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs">Clear Search</button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function handleSearchChange(e) {
    searchQuery = e.target.value;
    renderOrdersList();
}

function handleSectionTabChange(secId) {
    activeSection = secId;
    renderOrdersList();
}

function clearSearchFilters() {
    searchQuery = '';
    activeSection = 'ALL';
    renderOrdersList();
}

// 1:1 Pixel-Faithful Replica of Mac App OrderCard UI
function renderMacStyleOrderCard(order, section) {
    const urgency = getOrderUrgency(order);
    const qty = getOrderActualQty(order);
    const amount = getOrderTotalAmount(order);
    const cashback = getOrderCashback(order);
    const fileCount = (order.files || []).length;
    const twoParts = order.bl_count === 2;

    const supplier = allSuppliers.find(s => s.id === order.supplier_id);
    const supplierName = supplier?.name || 'International Supplier';
    
    // Factory identification (Only Name, No address)
    const isDifferentFactory = order.portal_customer_id && Number(order.portal_customer_id) === Number(currentCustomer.id) && Number(order.customer_id) !== Number(currentCustomer.id);
    const factoryCustomer = isDifferentFactory ? allCustomers.find(c => c.id === Number(order.customer_id)) : currentCustomer;
    const factoryName = factoryCustomer?.name || currentCustomer.name;

    const statusBadgeMap = {
        Delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        Shipped: 'bg-sky-100 text-sky-800 border-sky-300',
        Completed: 'bg-teal-100 text-teal-800 border-teal-300',
        Confirmed: 'bg-teal-100 text-teal-800 border-teal-300',
        'In Production': 'bg-teal-100 text-teal-800 border-teal-300',
        Pending: 'bg-amber-100 text-amber-800 border-amber-300',
        Cancelled: 'bg-rose-100 text-rose-800 border-rose-300',
    };

    const statusBadge = (st) => `
        <span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${statusBadgeMap[st] || statusBadgeMap.Pending}">
            <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
            ${st}
        </span>
    `;

    return `
        <div onclick="navigateToOrderDetail(${order.id})" 
             class="group relative cursor-pointer rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-blue-400 hover:shadow-xs transition select-none">
            
            <!-- Top Header: Order ID, Date, LC & Status (Exact Mac App Header) -->
            <div class="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 rounded-t-xl ${section.headerBg} transition-colors">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-xs font-black px-2 py-0.5 rounded shadow-2xs ${section.idBadge}">
                        Order #${order.id}
                    </span>
                    <span class="text-xs font-medium text-gray-600 inline-flex items-center gap-1">
                        <i data-lucide="calendar" class="w-3.5 h-3.5 text-gray-400"></i>
                        <span>${order.order_date || 'N/A'}</span>
                    </span>
                    ${order.lc_no ? `
                        <span class="font-mono text-xs text-gray-700 bg-white/90 border border-gray-300 px-2 py-0.5 rounded">
                            LC: <span class="font-bold text-gray-900">${order.lc_no}</span>
                        </span>
                    ` : ''}
                    ${twoParts ? `
                        <span class="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            ⚡ 2 Split Shipments
                        </span>
                    ` : statusBadge(order.status || 'Pending')}

                    ${isDifferentFactory ? `
                        <span class="rounded border border-amber-400 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow-2xs">
                            Factory: ${factoryName}
                        </span>
                    ` : ''}

                    ${urgency.level >= 2 ? `
                        <span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black border animate-pulse ${urgency.level === 3 ? 'border-rose-400 bg-rose-100 text-rose-800' : 'border-amber-400 bg-amber-100 text-amber-800'}">
                            <i data-lucide="alert-triangle" class="w-3 h-3"></i>
                            <span>${urgency.diff !== null && urgency.diff <= 0 ? 'ETA ARRIVED' : `${urgency.diff}D TO ETA`}</span>
                        </span>
                    ` : ''}
                </div>

                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                    <button onclick="navigateToOrderDetail(${order.id})" class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs">
                        <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600"></i>
                        <span class="hidden sm:inline">Details</span>
                    </button>
                    <button onclick="printOrderInvoiceLegacy(${order.id})" class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs">
                        <i data-lucide="printer" class="w-3.5 h-3.5 text-gray-700"></i>
                        <span class="hidden sm:inline">Print Order</span>
                    </button>
                </div>
            </div>

            <!-- Main Body: Supplier/Factory + Shipment Info + Financials (Exact Mac 3-Column Layout) -->
            <div class="p-3">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-center">
                    
                    <!-- Col 1: Factory / Supplier Name (No Address, Clean Name Only) -->
                    <div class="md:col-span-4 min-w-0">
                        <p class="font-display text-sm font-bold text-gray-900 truncate leading-snug">
                            ${factoryName}
                        </p>
                        <div class="flex items-center gap-1.5 text-xs text-gray-500 pt-0.5">
                            <span class="text-gray-400 text-[11px]">Supplier:</span>
                            <span class="font-medium text-gray-800 truncate">${supplierName}</span>
                            ${fileCount > 0 ? `
                                <span class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 shrink-0">
                                    <i data-lucide="paperclip" class="w-3 h-3"></i> ${fileCount}
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Col 2: Shipment Details (ETD, ETA, PI, BL - Roomy for single or 2 parts) -->
                    <div class="md:col-span-5 md:border-l md:border-gray-200 md:pl-3">
                        ${twoParts ? `
                            <div class="grid grid-cols-2 gap-2 text-xs">
                                <!-- Part 1 -->
                                <div class="text-[11px] leading-snug space-y-0.5">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[10px] font-black uppercase text-amber-700">Part 1</span>
                                        ${statusBadge(getPartStatus(order, 1))}
                                    </div>
                                    <p class="text-gray-700 truncate">PI: <strong class="font-mono text-gray-900">${order.pi1 || '—'}</strong> | BL: <strong class="font-mono text-gray-800">${order.bl1 || '—'}</strong></p>
                                    <p class="text-gray-600 text-[10.5px]">ETD: ${order.shipment_date_1 || '—'} | ETA: <strong class="text-blue-700">${order.etd_1 || '—'}</strong></p>
                                </div>
                                <!-- Part 2 -->
                                <div class="text-[11px] leading-snug space-y-0.5 border-l border-gray-200 pl-2">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[10px] font-black uppercase text-gray-600">Part 2</span>
                                        ${statusBadge(getPartStatus(order, 2))}
                                    </div>
                                    <p class="text-gray-700 truncate">PI: <strong class="font-mono text-gray-900">${order.pi2 || '—'}</strong> | BL: <strong class="font-mono text-gray-800">${order.bl2 || '—'}</strong></p>
                                    <p class="text-gray-600 text-[10.5px]">ETD: ${order.shipment_date_2 || '—'} | ETA: <strong class="text-blue-700">${order.etd_2 || '—'}</strong></p>
                                </div>
                            </div>
                        ` : `
                            <div class="text-xs space-y-1">
                                <div class="flex items-center gap-3 text-[11.5px]">
                                    <span><span class="text-gray-400 text-[10px]">PI:</span> <span class="font-mono font-bold text-gray-900">${order.pi1 || order.pi_no || '—'}</span></span>
                                    <span><span class="text-gray-400 text-[10px]">BL:</span> <span class="font-mono font-bold text-gray-800">${order.bl1 || '—'}</span></span>
                                    ${order.dhl_tracking_1 ? `<span><span class="text-gray-400 text-[10px]">DHL:</span> <span class="font-mono text-gray-700">${order.dhl_tracking_1}</span></span>` : ''}
                                </div>
                                <div class="flex items-center gap-3 text-[11px] text-gray-600">
                                    ${order.shipment_date_1 ? `<span><span class="text-gray-400 text-[10px]">ETD:</span> <span class="font-medium text-gray-800">${order.shipment_date_1}</span></span>` : ''}
                                    ${order.etd_1 ? `<span><span class="text-gray-400 text-[10px]">ETA:</span> <span class="font-bold text-blue-700">${order.etd_1}</span></span>` : ''}
                                </div>
                            </div>
                        `}
                    </div>

                    <!-- Col 3: Quantity & Value (Right Aligned Exact Mac Metrics) -->
                    <div class="md:col-span-3 md:border-l md:border-gray-200 md:pl-3 flex flex-col justify-center text-right">
                        <div>
                            <span class="font-numeric text-xs sm:text-sm font-black text-gray-900 block leading-tight">
                                ${qty.toFixed(2)} MT
                            </span>
                            <span class="font-numeric text-xs font-bold text-emerald-700 block leading-tight mt-0.5">
                                $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        ${cashback > 0 ? `
                            <p class="text-[10px] text-pink-700 font-semibold mt-0.5">
                                Cashback: $${cashback.toFixed(2)}
                            </p>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Full Dedicated Order Details Page
function renderOrderDetailPage(order) {
    const content = document.getElementById('customerPortalBody');
    if (!content) return;

    const status = order.status || 'Pending';
    const qty = getOrderActualQty(order);
    const amount = getOrderTotalAmount(order);
    const cashback = getOrderCashback(order);
    const items = order.items || [];
    const files = order.files || [];
    const notes = order.customer_notes || [];
    const piDisplay = order.pi1 ? (order.bl_count === 2 && order.pi2 ? `${order.pi1} / ${order.pi2}` : order.pi1) : (order.pi_no || 'N/A');

    const supplier = allSuppliers.find(s => s.id === order.supplier_id);
    const supplierName = supplier?.name || 'International Supplier';

    // Factory identification (Only Name, No Address)
    const isDifferentFactory = order.portal_customer_id && Number(order.portal_customer_id) === Number(currentCustomer.id) && Number(order.customer_id) !== Number(currentCustomer.id);
    const factoryCustomer = isDifferentFactory ? allCustomers.find(c => c.id === Number(order.customer_id)) : currentCustomer;
    const factoryName = factoryCustomer?.name || currentCustomer.name;

    content.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <!-- Top Navigation & Print Order Button -->
            <div class="flex items-center justify-between pb-3 border-b border-gray-200">
                <button onclick="navigateBackToOrdersList()" 
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Orders
                </button>
                <div class="flex items-center gap-2">
                    <button onclick="printOrderInvoiceLegacy(${order.id})" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition">
                        <i data-lucide="printer" class="w-4 h-4"></i>
                        <span>Print Order</span>
                    </button>
                </div>
            </div>

            <!-- Order Header Card (Clean Names: Supplier & Factory) -->
            <div class="bg-gradient-to-r from-navy-950 to-navy-900 text-white p-4 sm:p-6 rounded-2xl border border-navy-800 shadow-md">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span class="text-xs uppercase tracking-widest text-brand-gold font-bold">Roza Indent Order</span>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-white border border-white/20">${status}</span>
                            ${isDifferentFactory ? `
                                <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 text-navy-950">
                                    Factory: ${factoryName}
                                </span>
                            ` : ''}
                        </div>
                        <h2 class="text-xl sm:text-2xl font-extrabold font-display">Order #${order.id}</h2>
                        <div class="text-xs text-gray-300 mt-1 space-y-0.5">
                            <p><strong>Factory / Customer:</strong> <span class="text-white font-semibold">${factoryName}</span></p>
                            <p><strong>Supplier:</strong> <span class="text-white font-semibold">${supplierName}</span></p>
                            <p><strong>Date:</strong> ${order.order_date || 'N/A'} ${order.lc_no ? `· <strong>LC:</strong> ${order.lc_no}` : ''} · <strong>PI:</strong> ${piDisplay}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 text-right bg-white/10 p-3 rounded-xl border border-white/15">
                        <div>
                            <p class="text-[9px] uppercase font-bold text-gray-300">Quantity</p>
                            <p class="text-base sm:text-lg font-extrabold text-white">${qty.toFixed(2)} MT</p>
                        </div>
                        <div>
                            <p class="text-[9px] uppercase font-bold text-gray-300">Total Value</p>
                            <p class="text-base sm:text-lg font-extrabold text-emerald-400">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Product Specifications Table -->
            <div>
                <h3 class="font-bold text-xs uppercase tracking-wider text-gray-700 mb-2 font-display">
                    Ordered Products &amp; Specifications
                </h3>
                <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
                    <table class="w-full text-left text-xs min-w-[500px]">
                        <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[10px]">
                            <tr>
                                <th class="p-3">Product Name</th>
                                <th class="p-3">Size</th>
                                <th class="p-3">GSM</th>
                                <th class="p-3">Packing</th>
                                <th class="p-3 text-right">Quantity</th>
                                <th class="p-3 text-right">Unit Price</th>
                                <th class="p-3 text-right">Total USD</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${items.map(it => {
                                const q = parseFloat(it.quantity) || 0;
                                const p = parseFloat(it.price) || 0;
                                return `
                                    <tr>
                                        <td class="p-3 font-bold text-gray-900">${it.product_name || it.product_id || 'Paper / Board'}</td>
                                        <td class="p-3 text-gray-600">${it.size || '—'}</td>
                                        <td class="p-3 text-gray-600">${it.gsm ? it.gsm + ' GSM' : '—'}</td>
                                        <td class="p-3 text-gray-600">${it.unit_type || 'REEL'}</td>
                                        <td class="p-3 text-right font-bold">${q.toFixed(2)} MT</td>
                                        <td class="p-3 text-right text-gray-700">$${p.toFixed(2)}</td>
                                        <td class="p-3 text-right font-extrabold text-gray-900">$${(q * p).toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot class="bg-gray-50 font-bold border-t border-gray-200 text-gray-900 text-xs">
                            <tr>
                                <td colspan="4" class="p-3 text-right uppercase">Total:</td>
                                <td class="p-3 text-right">${qty.toFixed(2)} MT</td>
                                <td></td>
                                <td class="p-3 text-right text-emerald-700 font-extrabold">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- Shipment Milestones & Details (Exact replication of Mac App shipment details) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="p-4 bg-white rounded-xl border border-gray-200 space-y-1.5 text-xs shadow-xs">
                    <span class="text-[10px] font-bold uppercase text-gray-400">LC &amp; PI Details</span>
                    <p><strong>LC Number:</strong> ${order.lc_no || 'Not updated'}</p>
                    <p><strong>PI 1:</strong> ${order.pi1 || 'N/A'} ${order.bl1 ? `· <strong>BL 1:</strong> ${order.bl1}` : ''}</p>
                    ${order.bl_count === 2 ? `<p><strong>PI 2:</strong> ${order.pi2 || 'N/A'} ${order.bl2 ? `· <strong>BL 2:</strong> ${order.bl2}` : ''}</p>` : ''}
                </div>

                <div class="p-4 bg-white rounded-xl border border-gray-200 space-y-1.5 text-xs shadow-xs">
                    <span class="text-[10px] font-bold uppercase text-gray-400">Shipment Milestones</span>
                    <p><strong>ETD (Shipment):</strong> ${order.shipment_date_1 || order.shipment_date || 'N/A'}</p>
                    <p><strong>ETA (Arrival Date):</strong> <span class="font-bold text-blue-700">${order.etd_1 || order.etd || 'N/A'}</span></p>
                    <p><strong>DHL Tracking:</strong> ${order.dhl_tracking_1 || order.dhl_tracking || 'N/A'}</p>
                </div>

                <div class="p-4 bg-white rounded-xl border border-gray-200 space-y-1.5 text-xs shadow-xs">
                    <span class="text-[10px] font-bold uppercase text-gray-400">Commercial &amp; Cashback</span>
                    <p><strong>Cashback Rate:</strong> ${order.cashback_rate ? `$${order.cashback_rate} / MT` : 'None'}</p>
                    <p><strong>Total Cashback:</strong> <span class="font-bold text-pink-600">$${cashback.toFixed(2)}</span></p>
                    ${order.tracking_link ? `
                        <p class="truncate pt-1">
                            <strong>Live Tracking:</strong> 
                            <a href="${order.tracking_link}" target="_blank" class="text-blue-600 underline">Track Vessel Link</a>
                        </p>
                    ` : ''}
                </div>
            </div>

            <!-- Documents & File Downloads -->
            <div>
                <h3 class="font-bold text-xs uppercase tracking-wider text-gray-700 mb-2 font-display">
                    Order Documents &amp; Files (${files.length})
                </h3>
                ${files.length === 0 ? `
                    <div class="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-400 italic">
                        No files or document attachments uploaded for this order yet.
                    </div>
                ` : `
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        ${files.map(file => `
                            <a href="${file.webViewLink || file.url || '#'}" target="_blank" 
                               class="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-xs transition text-xs">
                                <div class="flex items-center gap-2 truncate pr-2">
                                    <i data-lucide="file-text" class="w-4 h-4 text-blue-600 shrink-0"></i>
                                    <span class="truncate font-medium text-gray-800">${file.name || 'Order Attachment'}</span>
                                </div>
                                <span class="text-blue-600 font-semibold text-[11px] shrink-0 flex items-center gap-1">
                                    <i data-lucide="download" class="w-3.5 h-3.5"></i> Download
                                </span>
                            </a>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Notes & Remarks Section -->
            <div class="pt-3 border-t border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-bold text-xs uppercase tracking-wider text-gray-700 font-display">
                        Client Remarks / Notes (${notes.length})
                    </h3>
                    <button onclick="toggleNoteInput(${order.id})" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
                        <i data-lucide="message-square" class="w-3.5 h-3.5"></i> Add Note
                    </button>
                </div>

                <div id="noteBox-${order.id}" class="hidden mb-3 p-3 bg-white rounded-xl border border-gray-300 space-y-2">
                    <textarea id="noteInput-${order.id}" rows="2" placeholder="Write any instruction, remark, or question for Roza International..." 
                              class="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"></textarea>
                    <div class="flex justify-end gap-2">
                        <button onclick="toggleNoteInput(${order.id})" class="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onclick="submitCustomerNote(${order.id})" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">Save Note</button>
                    </div>
                </div>

                ${notes.length === 0 ? `
                    <p class="text-xs text-gray-400 italic">No notes added yet.</p>
                ` : `
                    <div class="space-y-1.5">
                        ${notes.map(n => `
                            <div class="p-3 rounded-xl bg-white border border-gray-200 text-xs">
                                <div class="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                                    <strong class="text-gray-700">${n.author || 'Client'}</strong>
                                    <span>${n.date ? new Date(n.date).toLocaleString() : ''}</span>
                                </div>
                                <p class="text-gray-800">${n.text}</p>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Bottom Print Button -->
            <div class="pt-4 border-t border-gray-200 flex justify-end">
                <button onclick="printOrderInvoiceLegacy(${order.id})" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                    <span>Print Order</span>
                </button>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function toggleNoteInput(orderId) {
    const box = document.getElementById(`noteBox-${orderId}`);
    if (box) box.classList.toggle('hidden');
}

async function submitCustomerNote(orderId) {
    const input = document.getElementById(`noteInput-${orderId}`);
    if (!input || !input.value.trim()) return;

    const noteText = input.value.trim();
    const newNote = {
        text: noteText,
        date: new Date().toISOString(),
        author: currentCustomer.name || 'Customer'
    };

    try {
        const order = customerOrders.find(o => o.id === orderId);
        if (!order) return;

        const updatedNotes = [...(order.customer_notes || []), newNote];
        order.customer_notes = updatedNotes;

        const res = await fetch(`${SB_URL}/rest/v1/app_data?key=eq.agent_orders&select=data`, {
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
        });
        const rows = await res.json();
        const allOrders = (Array.isArray(rows) && rows[0]?.data) ? rows[0].data : [];

        const updatedAll = allOrders.map(o => o.id === orderId ? { ...o, customer_notes: updatedNotes } : o);

        await fetch(`${SB_URL}/rest/v1/app_data`, {
            method: 'POST',
            headers: {
                'apikey': SB_KEY,
                'Authorization': `Bearer ${SB_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                key: 'agent_orders',
                data: updatedAll,
                updated_at: new Date().toISOString()
            })
        });

        alert('Your note has been saved and shared with Roza International!');
        renderOrderDetailPage(order);
    } catch (err) {
        alert('Could not save note: ' + err.message);
    }
}

// Print Order Invoice matching the exact Original App "invoice-bw" layout & CSS
function printOrderInvoiceLegacy(orderId) {
    const order = customerOrders.find(o => o.id === orderId);
    if (!order) return;

    const supplier = allSuppliers.find(s => s.id === order.supplier_id) || {};
    const isDifferentFactory = order.portal_customer_id && Number(order.portal_customer_id) === Number(currentCustomer.id) && Number(order.customer_id) !== Number(currentCustomer.id);
    const customer = (isDifferentFactory ? allCustomers.find(c => c.id === order.customer_id) : null) || currentCustomer;

    let items = [];
    const isDelivered = order.status === 'Delivered';
    if (isDelivered && order.actual_items?.length) {
        items = order.actual_items.map(actualItem => {
            if (actualItem.price == null) {
                const originalItem = (order.items || []).find(it => it.product_id === actualItem.product_id);
                return { ...actualItem, price: originalItem ? originalItem.price : 0 };
            }
            return actualItem;
        });
    } else if (order.items?.length) {
        items = order.items;
    }

    let tableRows = '';
    let totalQty = 0;
    let totalAmount = 0;

    items.forEach(item => {
        const prod = allProducts.find(p => String(p.id) === String(item.product_id));
        const pname = item.product_name || (prod ? prod.name : 'Unknown');
        const hsCode = item.hs_code || (prod ? prod.hs_code : '');
        const gsm = item.gsm || '';
        const size = item.size || '';
        const unitType = item.unit_type || 'REEL';
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const amount = qty * price;
        totalQty += qty;
        totalAmount += amount;
        const descDisplay = `${pname}${hsCode ? ' (HS: ' + hsCode + ')' : ''}${gsm ? ' (GSM: ' + gsm + ')' : ''}`;

        tableRows += `
            <tr>
                <td rowspan="3" style="vertical-align:middle;">${qty.toFixed(2)} MT</td>
                <td class="left" style="vertical-align:middle;">${descDisplay}</td>
                <td rowspan="3" style="vertical-align:middle;">USD ${price.toFixed(2)}/MT</td>
                <td rowspan="3" style="vertical-align:middle;font-weight:700;">USD ${amount.toFixed(2)}</td>
            </tr>
            <tr class="sub-row"><td class="left">SUBSTANCE (GSM): ${gsm || '—'}</td></tr>
            <tr class="sub-row"><td class="left">SIZE(MM): ${size || '—'}</td></tr>
            <tr class="sub-row" style="border-bottom:1px solid #888;">
                <td class="left" style="border-top:none;">Packing: ${unitType}</td>
                <td colspan="3" style="border-top:none;"></td>
            </tr>
        `;
    });

    tableRows += `
        <tr class="total-row">
            <td>${totalQty.toFixed(2)} MT</td>
            <td class="left"><strong>TOTAL</strong></td>
            <td></td>
            <td class="total-amount"><strong>USD ${totalAmount.toFixed(2)}</strong></td>
        </tr>
    `;

    const piDisplay = order.pi1 ? (order.bl_count === 2 && order.pi2 ? `${order.pi1} / ${order.pi2}` : order.pi1) : (order.pi_no || 'Not Yet');
    const orderDate = order.order_date
        ? new Date(order.order_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Not Yet';
    const blCount = order.bl_count || 1;

    let pairsHtml = '';
    if (blCount === 1) {
        pairsHtml = `
            <div class="pair-group">
                <div class="pair-title">PI &amp; Shipment Details</div>
                <div class="pair-row">
                    <div class="pair-item"><strong>PI No:</strong> ${order.pi1 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>BL No:</strong> ${order.bl1 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>ETD:</strong> ${order.shipment_date_1 || order.shipment_date || 'Not Yet'}</div>
                    <div class="pair-item"><strong>ETA:</strong> ${order.etd_1 || order.etd || 'Not Yet'}</div>
                    <div class="pair-item"><strong>DHL:</strong> ${order.dhl_tracking_1 || order.dhl_tracking || 'Not Yet'}</div>
                </div>
            </div>
        `;
    } else {
        pairsHtml = `
            <div class="pair-group">
                <div class="pair-title">PI-1 Details</div>
                <div class="pair-row">
                    <div class="pair-item"><strong>PI No:</strong> ${order.pi1 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>BL No:</strong> ${order.bl1 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>ETD:</strong> ${order.shipment_date_1 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>ETA:</strong> ${order.etd_1 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>DHL:</strong> ${order.dhl_tracking_1 || 'Not Yet'}</div>
                </div>
            </div>
            <div class="pair-group">
                <div class="pair-title">PI-2 Details</div>
                <div class="pair-row">
                    <div class="pair-item"><strong>PI No:</strong> ${order.pi2 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>BL No:</strong> ${order.bl2 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>ETD:</strong> ${order.shipment_date_2 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>ETA:</strong> ${order.etd_2 || 'Not Yet'}</div>
                    <div class="pair-item"><strong>DHL:</strong> ${order.dhl_tracking_2 || 'Not Yet'}</div>
                </div>
            </div>
        `;
    }

    const cbRate = parseFloat(order.cashback_rate) || 0;
    const cbTotal = cbRate > 0 ? cbRate * totalQty : 0;
    const cashbackHtml = (cbRate > 0 && cbTotal > 0)
        ? `<div class="cashback-row"><span class="cb-label">Cashback ($${cbRate}/ton × ${totalQty.toFixed(2)} tons)</span><span class="cb-amount">- $${cbTotal.toFixed(2)}</span></div>`
        : '';

    const trackingHtml = order.tracking_link
        ? `<div class="tracking-row"><strong>Tracking:</strong> <a href="${order.tracking_link}" target="_blank">${order.tracking_link}</a></div>`
        : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups in your browser to print the invoice.');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice #${order.id} - ${customer.name}</title>
            <style>
                body { margin:0; padding:0; font-family:'Inter', Arial, sans-serif; background:#fff; color:#000; }
                .invoice-bw { box-sizing:border-box; background:#fff; width:210mm; min-height:297mm; padding:12mm; margin:0 auto; font-size:9.5pt; color:#000; line-height:1.4; }
                .invoice-bw *, .invoice-bw *::before, .invoice-bw *::after { box-sizing:border-box; }
                .invoice-bw .inv-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:0.5rem; margin-bottom:0.8rem; border-bottom:2px solid #000; }
                .invoice-bw .inv-header .left { display:flex; align-items:center; gap:0.8rem; }
                .invoice-bw .inv-header .left .logo-img { max-height:50px; max-width:140px; object-fit:contain; }
                .invoice-bw .inv-header .left .company-details .company-name { font-weight:700; font-size:12pt; }
                .invoice-bw .inv-header .left .company-details .company-addr, .invoice-bw .inv-header .left .company-details .company-contact { font-size:7.5pt; color:#555; }
                .invoice-bw .inv-header .right { text-align:right; font-size:8.5pt; flex-shrink:0; white-space:nowrap; }
                .invoice-bw .inv-header .right .pi-no { font-weight:700; font-size:10pt; white-space:nowrap; }
                .invoice-bw .party-info { display:flex; justify-content:space-between; align-items:center; background:#f5f5f5; padding:0.5rem 0.8rem; border-radius:4px; margin-bottom:0.6rem; font-size:8.5pt; border-left:3px solid #888; }
                .invoice-bw .party-info .addr { font-size:7.5pt; color:#555; margin-top:0.1rem; }
                .invoice-bw .inv-table-wrap table { width:100%; border-collapse:collapse; font-size:8pt; margin-bottom:0.5rem; }
                .invoice-bw .inv-table-wrap table th { background:#000; color:#fff; padding:0.22rem 0.3rem; text-align:center; vertical-align:middle; font-weight:600; font-size:7pt; text-transform:uppercase; border:1px solid #000; }
                .invoice-bw .inv-table-wrap table td { padding:0.22rem 0.3rem; border:1px solid #888; text-align:center; vertical-align:middle; }
                .invoice-bw .inv-table-wrap table td.left { text-align:left; padding-left:0.5rem; }
                .invoice-bw .inv-table-wrap table .sub-row td { font-size:7pt; color:#555; border-top:none; padding:0.08rem 0.3rem; }
                .invoice-bw .inv-table-wrap table .total-row td { font-weight:700; background:#f5f5f5; padding:0.28rem 0.3rem; }
                .invoice-bw .details-pairs { margin-bottom:0.5rem; }
                .invoice-bw .details-pairs .pair-group { background:#fafafa; border:1px solid #ddd; border-radius:4px; padding:0.45rem 0.7rem; margin-bottom:0.35rem; }
                .invoice-bw .details-pairs .pair-group:last-child { margin-bottom:0; }
                .invoice-bw .details-pairs .pair-group .pair-title { font-weight:700; font-size:8pt; border-bottom:1px dashed #ddd; padding-bottom:0.2rem; margin-bottom:0.25rem; }
                .invoice-bw .details-pairs .pair-group .pair-row { display:grid; grid-template-columns:1fr 1fr; gap:0.15rem 0.6rem; font-size:7.8pt; }
                .invoice-bw .extra-details { display:grid; grid-template-columns:1fr 1fr; gap:0.15rem 1rem; font-size:8pt; background:#f5f5f5; border-radius:4px; border:1px solid #ddd; padding:0.35rem 0.7rem; margin:0.4rem 0 0.5rem 0; }
                .invoice-bw .section-title { font-weight:700; font-size:9.5pt; border-bottom:1px solid #ddd; padding-bottom:0.2rem; margin:0.9rem 0 0.5rem 0; }
                .invoice-bw .cashback-row { display:flex; justify-content:flex-end; align-items:center; gap:1rem; padding:0.2rem 0.6rem; background:#fce7f3; border-radius:4px; border:1px solid #f9a8d4; margin-top:0.3rem; font-weight:600; font-size:9pt; color:#db2777; }
                .invoice-bw .cashback-row .cb-label { font-weight:500; color:#831843; }
                .invoice-bw .cashback-row .cb-amount { font-weight:700; font-size:10pt; }
                .invoice-bw .tracking-row { display:flex; justify-content:flex-end; align-items:center; gap:0.5rem; padding:0.2rem 0.6rem; background:#dbeafe; border-radius:4px; border:1px solid #93c5fd; margin-top:0.3rem; font-size:8pt; }
                .invoice-bw .tracking-row a { color:#2563eb; text-decoration:underline; word-break:break-all; }
                .invoice-bw .signature-section { display:flex; justify-content:space-between; margin-top:1.5rem; padding-top:0.6rem; border-top:1px solid #ddd; }
                .invoice-bw .signature-section .sig-block { text-align:center; min-width:120px; flex:1; }
                .invoice-bw .signature-section .sig-block .sig-company { font-weight:700; font-size:8.5pt; }
                .invoice-bw .signature-section .sig-block .sig-line { border-top:1px solid #000; width:150px; margin:4rem auto 0.7rem auto; }
                .invoice-bw .footer-line { margin-top:0.7rem; text-align:center; font-size:7pt; color:#888; border-top:1px solid #eee; padding-top:0.4rem; }
                @media print { body { margin:0; padding:0; } .invoice-bw { margin:0; box-shadow:none; border-radius:0; width:100%; } }
            </style>
        </head>
        <body>
            <div class="invoice-bw">
                <div class="inv-header">
                    <div class="left">
                        <img src="/static/logo.png" class="logo-img" alt="Logo" onerror="this.style.display='none'" />
                        <div class="company-details">
                            <div class="company-name">${COMPANY.name}</div>
                            <div class="company-addr">${COMPANY.address}</div>
                            <div class="company-contact">${COMPANY.phone} | ${COMPANY.website}</div>
                        </div>
                    </div>
                    <div class="right">
                        <div class="pi-no"><strong>PI No.:</strong> <span>${piDisplay}</span></div>
                        <div><strong>Date:</strong> ${orderDate}</div>
                    </div>
                </div>

                <div class="party-info">
                    <div class="seller" style="flex:1;">
                        <div style="font-weight:700;font-size:8.5pt;">SELLER:</div>
                        <div style="font-weight:600;font-size:9pt;">${supplier.name || 'International Supplier'}</div>
                        <div class="addr">${supplier.address || ''}</div>
                    </div>
                    <div class="buyer" style="flex:1;">
                        <div style="font-weight:700;font-size:8.5pt;">BUYER:</div>
                        <div style="font-weight:600;font-size:9pt;">${customer.name}</div>
                        <div class="addr">${customer.address || ''}</div>
                    </div>
                </div>

                <div class="inv-table-wrap">
                    <table>
                        <thead>
                            <tr><th>QUANTITY</th><th>PRODUCT DESCRIPTION</th><th>UNIT PRICE</th><th>AMOUNT</th></tr>
                            <tr><th></th><th>SUBSTANCE (GSM)</th><th></th><th></th></tr>
                            <tr><th></th><th>SIZE(MM)</th><th></th><th></th></tr>
                            <tr><th></th><th>Packing</th><th></th><th></th></tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>

                ${cashbackHtml}

                <div class="extra-details">
                    <div><strong>LC No:</strong> ${order.lc_no || 'Not Yet'}</div>
                    <div><strong>BL Count:</strong> ${blCount}</div>
                </div>

                <div class="details-pairs">
                    ${pairsHtml}
                </div>

                ${trackingHtml}

                <div class="signature-section">
                    <div class="sig-block">
                        <div class="sig-company">${customer.name}</div>
                        <div class="sig-line"></div>
                        <div>Authorized Signature</div>
                    </div>
                    <div class="sig-block">
                        <div class="sig-company">${COMPANY.name}</div>
                        <div class="sig-line"></div>
                        <div>Authorized Signature</div>
                    </div>
                </div>

                <div class="footer-line">
                    This document was officially generated by Roza International Indenting System.
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
