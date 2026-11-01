// ROZA INTERNATIONAL - Dedicated Customer Order Portal Script
const SB_URL = 'https://secvddpmfkudsahdkgfx.supabase.co';
const SB_KEY = 'sb_publishable_9OXdSbpr3mrb5QqYK29oog_ugQ53GMh';

let currentCustomer = null;
let customerOrders = [];
let allCustomers = [];
let allProducts = [];
let allSuppliers = [];
let searchQuery = '';
let searchScope = 'all'; // 'all' | 'lc' | 'pi' | 'product' | 'supplier'
let activeFilter = 'all'; // 'all' | 'Pending' | 'In Production' | 'Shipped' | 'Delivered'
let currentViewingOrderId = null;

// Company info for invoice/memo
const COMPANY = {
    name: 'ROZA INTERNATIONAL',
    address: '49/1/B, Purana Paltan Lane, Dhaka, Bangladesh',
    phone: '+880 1970 026390',
    email: 'tanjil@rozainternational.com',
    website: 'www.rozainternational.com'
};

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
        <div class="max-w-md mx-auto py-8 sm:py-12">
            <div class="text-center mb-6">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100 shadow-xs">
                    <i data-lucide="shield-check" class="w-7 h-7"></i>
                </div>
                <h3 class="text-xl sm:text-2xl font-bold text-gray-900 font-display">Client Order Portal</h3>
                <p class="text-xs sm:text-sm text-gray-500 mt-1">Log in with your Phone Number or Email & Password assigned by Roza International.</p>
            </div>

            <form id="portalLoginForm" onsubmit="handlePortalLogin(event)" class="bg-gray-50/80 p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phone Number or Email</label>
                    <input type="text" id="portalIdentifier" required placeholder="e.g. 01711... or buyer@company.com" 
                           class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Portal Password</label>
                    <input type="password" id="portalPassword" required placeholder="Enter your portal password" 
                           class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white">
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

// Helpers for calculations
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

// Helper to check part status
function getPortalPartStatus(order, partNum = 1) {
    if (order.status === 'Cancelled') return 'Cancelled';
    if (partNum === 1) {
        if (order.part1_delivered) return 'Delivered';
        if (order.part1_shipped || order.status === 'Shipped' || order.status === 'Delivered') return 'Shipped';
        if (order.status === 'Completed') return 'Confirmed';
        return order.status || 'Pending';
    }
    if (partNum === 2) {
        if (order.part2_delivered) return 'Delivered';
        if (order.part2_shipped) return 'Shipped';
        if (order.part2_status) return order.part2_status;
        if (order.status === 'Shipped' && (order.part2_pending || !order.part2_shipped)) return 'In Production';
        if (order.status === 'Delivered') return 'Delivered';
        if (order.status === 'Completed') return 'Confirmed';
        return order.status || 'Pending';
    }
    return order.status;
}

// Exact replication of Mac App getOrderUrgency
function getOrderUrgency(order) {
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
        return { level: 0, text: '', diff: null };
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayDate = new Date(todayStr);
    todayDate.setHours(0, 0, 0, 0);

    let targetDate = null;
    let partLabel = 'ETA';

    if (order.bl_count === 2) {
        const p1Status = getPortalPartStatus(order, 1);
        const p2Status = getPortalPartStatus(order, 2);

        // If Part 1 is shipped and not delivered yet
        if (p1Status === 'Shipped' && !order.part1_delivered && (order.etd_1 || order.etd)) {
            targetDate = order.etd_1 || order.etd;
            partLabel = 'Part 1 ETA';
        } else if (p2Status === 'Shipped' && !order.part2_delivered && order.etd_2) {
            targetDate = order.etd_2;
            partLabel = 'Part 2 ETA';
        } else if (!order.part1_delivered && (order.etd_1 || order.etd)) {
            targetDate = order.etd_1 || order.etd;
            partLabel = 'Part 1 ETA';
        }
    } else {
        if (order.status === 'Shipped' || order.part1_shipped) {
            targetDate = order.etd_1 || order.etd;
            partLabel = 'ETA';
        }
    }

    if (!targetDate) return { level: 0, text: '', diff: null };

    const etaDate = new Date(targetDate);
    etaDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((etaDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diff <= 0) return { level: 3, text: `${partLabel} Arrived / Overdue`, diff, partLabel };
    if (diff <= 7) return { level: 2, text: `${partLabel}: ${diff}D to ETA (Ship Approaching)`, diff, partLabel };
    return { level: 1, text: `${partLabel}: ${diff}D to ETA`, diff, partLabel };
}

// Exact replication of Mac App getUrgentOrders
function getUrgentOrders(orders) {
    return orders
        .filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled')
        .map(order => ({ order, urgency: getOrderUrgency(order) }))
        .filter(item => item.urgency.level >= 2)
        .sort((a, b) => b.urgency.level - a.urgency.level || (a.urgency.diff ?? 999) - (b.urgency.diff ?? 999));
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
                `Order #${o.id} is now available in your portal (PI: ${o.pi1 || o.pi_no || 'Pending'}).`
            );
        });
    }
    localStorage.setItem(knownKey, JSON.stringify(orders.map(o => o.id)));

    const urgent = getUrgentOrders(orders);
    urgent.forEach(({ order, urgency }) => {
        const notifKey = `ship_alert_${currentCustomer.id}_${order.id}_${todayStr}`;
        if (!localStorage.getItem(notifKey)) {
            localStorage.setItem(notifKey, '1');
            triggerBrowserNotification(
                urgency.level === 3 ? `🚨 ETA Arrived: Order #${order.id}` : `🚢 Ship Approaching: Order #${order.id}`,
                `Order #${order.id} (PI: ${order.pi1 || order.pi_no || 'N/A'}) - ${urgency.text}`
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

    // Filter by search query & scope & status filter
    const q = searchQuery.toLowerCase().trim();
    const filteredOrders = customerOrders.filter(order => {
        // Status filter
        if (activeFilter !== 'all') {
            if (activeFilter === 'In Production') {
                if (order.status !== 'In Production' && order.status !== 'Confirmed') return false;
            } else if (order.status !== activeFilter) {
                return false;
            }
        }

        // Search scope logic matching Mac app
        if (!q) return true;
        const customerName = (allCustomers.find(c => c.id === order.customer_id)?.name || '').toLowerCase();
        const supplierName = (allSuppliers.find(s => s.id === order.supplier_id)?.name || '').toLowerCase();
        const lcNo = (order.lc_no || '').toLowerCase();
        const pi1 = (order.pi1 || order.pi_no || '').toLowerCase();
        const pi2 = (order.pi2 || '').toLowerCase();
        const idStr = String(order.id);
        const prodMatch = (order.items || []).some(it => (it.product_name || '').toLowerCase().includes(q));

        if (searchScope === 'lc') return lcNo.includes(q);
        if (searchScope === 'pi') return pi1.includes(q) || pi2.includes(q);
        if (searchScope === 'product') return prodMatch;
        if (searchScope === 'supplier') return supplierName.includes(q);

        // 'all' scope
        return idStr.includes(q) || lcNo.includes(q) || pi1.includes(q) || pi2.includes(q) || prodMatch || customerName.includes(q) || supplierName.includes(q);
    });

    // Grand totals
    const grandQty = customerOrders.reduce((sum, o) => sum + getOrderActualQty(o), 0);
    const grandAmount = customerOrders.reduce((sum, o) => sum + getOrderTotalAmount(o), 0);
    const grandCashback = customerOrders.reduce((sum, o) => sum + getOrderCashback(o), 0);
    const deliveredCount = customerOrders.filter(o => o.status === 'Delivered').length;

    // Exact Mac App Urgent Orders Alert Card
    const urgentOrders = getUrgentOrders(customerOrders);

    content.innerHTML = `
        <div class="space-y-5">
            <!-- Customer Welcome Header (Clean, Premium, High Contrast) -->
            <div class="bg-gradient-to-r from-navy-950 to-navy-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-navy-800 flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-gold/25 text-brand-gold border border-brand-gold/40 mb-1">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Client Order Portal
                    </span>
                    <h2 class="text-xl sm:text-2xl font-bold font-display truncate">${currentCustomer.name}</h2>
                    <p class="text-xs text-gray-300 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        ${currentCustomer.phone ? `<span>📞 ${currentCustomer.phone}</span>` : ''}
                        ${currentCustomer.email ? `<span>✉️ ${currentCustomer.email}</span>` : ''}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="renderPortalDashboard()" class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 flex items-center gap-1.5 transition">
                        <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
                    </button>
                    <button onclick="customerPortalLogout()" class="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition">
                        <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Log Out
                    </button>
                </div>
            </div>

            <!-- EXACT Mac App Urgent Orders Alert Card (Clean, Rose/Stamp Tone, 1:1 Design) -->
            ${urgentOrders.length > 0 ? `
                <div class="rounded-xl border border-rose-200 bg-rose-50/70 p-3 sm:p-3.5 shadow-2xs">
                    <p class="mb-2 flex items-center gap-1.5 text-xs font-bold text-rose-700">
                        <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-600 animate-pulse"></i>
                        <span>${urgentOrders.length} order${urgentOrders.length > 1 ? 's' : ''} need attention (Shipment Near ETA)</span>
                    </p>
                    <div class="space-y-1">
                        ${urgentOrders.slice(0, 6).map(({ order, urgency }) => `
                            <button onclick="navigateToOrderDetail(${order.id})" 
                                    class="flex w-full items-center justify-between rounded-lg bg-white px-3 py-1.5 text-left text-xs border border-rose-100 hover:border-rose-300 transition shadow-2xs">
                                <span class="font-medium text-gray-800 truncate pr-2">
                                    Order #${order.id} — PI: ${order.pi1 || order.pi_no || 'N/A'}${order.lc_no ? ' · LC: ' + order.lc_no : ''}
                                </span>
                                <span class="font-bold text-[11px] shrink-0 ${urgency.level === 3 ? 'text-rose-600 font-extrabold' : 'text-amber-700'}">
                                    ${urgency.text}
                                </span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 4 Clean Summary Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                    <p class="text-[10px] uppercase font-bold text-gray-400">Total Orders</p>
                    <p class="text-xl sm:text-2xl font-extrabold text-gray-900 mt-0.5">${customerOrders.length}</p>
                    <p class="text-[11px] text-gray-500">${deliveredCount} Delivered</p>
                </div>
                <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                    <p class="text-[10px] uppercase font-bold text-gray-400">Total Quantity</p>
                    <p class="text-xl sm:text-2xl font-extrabold text-blue-600 mt-0.5">${grandQty.toFixed(2)}</p>
                    <p class="text-[11px] text-gray-500">Metric Tons (MT)</p>
                </div>
                <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                    <p class="text-[10px] uppercase font-bold text-gray-400">Total Value</p>
                    <p class="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">$${grandAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p class="text-[11px] text-gray-500">USD Gross</p>
                </div>
                <div class="bg-white p-3.5 rounded-xl border border-pink-100 bg-pink-50/20 shadow-2xs">
                    <p class="text-[10px] uppercase font-bold text-pink-700">Cashback</p>
                    <p class="text-xl sm:text-2xl font-extrabold text-pink-600 mt-0.5">$${grandCashback.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p class="text-[11px] text-pink-800">Total Cashback</p>
                </div>
            </div>

            <!-- COMPACT & BEAUTIFUL SEARCH BAR WITH INTEGRATED SCOPE & STATUS PILLS (Exact Mac Style) -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
                <!-- Sleek Input Field -->
                <div class="relative flex-1 min-w-[220px]">
                    <i data-lucide="search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"></i>
                    <input type="text" id="portalSearchInput" value="${searchQuery}" oninput="handleSearchChange(event)"
                           placeholder="Search orders, LC, PI, product, supplier…" 
                           class="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white shadow-2xs">
                </div>

                <!-- Scope Pills (All, LC, PI, Product, Supplier) -->
                <div class="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5 shadow-2xs">
                    ${[
                        { id: 'all', label: 'All' },
                        { id: 'lc', label: 'LC No' },
                        { id: 'pi', label: 'PI No' },
                        { id: 'product', label: 'Product' },
                        { id: 'supplier', label: 'Supplier' }
                    ].map(s => `
                        <button onclick="handleScopeChange('${s.id}')"
                                class="rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${searchScope === s.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}">
                            ${s.label}
                        </button>
                    `).join('')}
                </div>

                <!-- Compact Status Selector -->
                <div class="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5 shadow-2xs">
                    ${[
                        { id: 'all', label: 'All Status' },
                        { id: 'Pending', label: 'Pending' },
                        { id: 'In Production', label: 'In Production' },
                        { id: 'Shipped', label: 'Shipped' },
                        { id: 'Delivered', label: 'Delivered' }
                    ].map(st => `
                        <button onclick="handleStatusFilter('${st.id}')"
                                class="rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${activeFilter === st.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}">
                            ${st.label}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Orders Clean List -->
            <div>
                <div class="flex items-center justify-between mb-2.5 px-1">
                    <h3 class="font-bold text-xs uppercase tracking-wider text-gray-700 font-display">
                        Order List (${filteredOrders.length}${filteredOrders.length !== customerOrders.length ? ` of ${customerOrders.length}` : ''})
                    </h3>
                    <span class="text-xs text-gray-400">Click any card to view full details</span>
                </div>

                ${filteredOrders.length === 0 ? `
                    <div class="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
                        <i data-lucide="inbox" class="w-8 h-8 mx-auto text-gray-300 mb-2"></i>
                        <p class="font-semibold text-xs sm:text-sm">No orders matching your search or filter</p>
                        ${(searchQuery || activeFilter !== 'all' || searchScope !== 'all') ? `
                            <button onclick="clearSearchFilters()" class="mt-2.5 px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold text-xs">Clear Search & Filters</button>
                        ` : ''}
                    </div>
                ` : `
                    <div class="space-y-2.5">
                        ${filteredOrders.map(order => renderCleanOrderCard(order)).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function handleSearchChange(e) {
    searchQuery = e.target.value;
    renderOrdersList();
}

function handleScopeChange(scope) {
    searchScope = scope;
    renderOrdersList();
}

function handleStatusFilter(status) {
    activeFilter = status;
    renderOrdersList();
}

function clearSearchFilters() {
    searchQuery = '';
    searchScope = 'all';
    activeFilter = 'all';
    renderOrdersList();
}

// Clean, User-Friendly Order Card (Exact 1:1 Mac OrdersView Replica)
function renderCleanOrderCard(order) {
    const status = order.status || 'Pending';
    let statusPill = 'bg-amber-100 text-amber-800 border-amber-300';
    if (status === 'Delivered') statusPill = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    else if (status === 'Shipped') statusPill = 'bg-sky-100 text-sky-800 border-sky-300';
    else if (status === 'In Production' || status === 'Confirmed' || status === 'Completed') statusPill = 'bg-pink-100 text-pink-800 border-pink-300';
    else if (status === 'Cancelled') statusPill = 'bg-rose-100 text-rose-800 border-rose-300';

    const qty = getOrderActualQty(order);
    const amount = getOrderTotalAmount(order);
    const avgPrice = qty > 0 ? amount / qty : 0;
    const cashback = getOrderCashback(order);
    const fileCount = (order.files || []).length;
    const piDisplay = order.pi1 ? (order.bl_count === 2 && order.pi2 ? `${order.pi1} / ${order.pi2}` : order.pi1) : (order.pi_no || '—');

    const supplier = allSuppliers.find(s => s.id === order.supplier_id);
    const supplierName = supplier?.name || 'International Supplier';

    const isDifferentFactory = order.portal_customer_id && Number(order.portal_customer_id) === Number(currentCustomer.id) && Number(order.customer_id) !== Number(currentCustomer.id);
    const factoryCustomer = isDifferentFactory ? allCustomers.find(c => c.id === Number(order.customer_id)) : currentCustomer;
    const factoryName = factoryCustomer?.name || currentCustomer.name;

    const isTwoParts = order.bl_count === 2;
    const p1Status = getPortalPartStatus(order, 1);
    const p2Status = getPortalPartStatus(order, 2);

    const getBoxTheme = (st) => {
        if (st === 'Delivered') return 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950';
        if (st === 'Shipped') return 'bg-sky-50/70 border-sky-200/90 text-sky-950';
        if (st === 'In Production' || st === 'Confirmed' || st === 'Completed') return 'bg-pink-50/70 border-pink-200/90 text-pink-950';
        return 'bg-amber-50/70 border-amber-200/90 text-amber-950';
    };

    const getPillTheme = (st) => {
        if (st === 'Delivered') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        if (st === 'Shipped') return 'bg-sky-100 text-sky-800 border-sky-300';
        if (st === 'In Production' || st === 'Confirmed' || st === 'Completed') return 'bg-pink-100 text-pink-800 border-pink-300';
        return 'bg-amber-100 text-amber-800 border-amber-300';
    };

    // Header styling based on order status exactly like Mac
    let headerBg = 'bg-amber-500/10 border-b border-amber-200/70';
    let idBadge = 'bg-amber-100 text-amber-900 border border-amber-300';
    if (status === 'Delivered') {
        headerBg = 'bg-emerald-500/10 border-b border-emerald-200/70';
        idBadge = 'bg-emerald-100 text-emerald-900 border border-emerald-300';
    } else if (status === 'Shipped') {
        headerBg = 'bg-sky-500/10 border-b border-sky-200/70';
        idBadge = 'bg-sky-100 text-sky-900 border border-sky-300';
    } else if (status === 'In Production' || status === 'Confirmed' || status === 'Completed') {
        headerBg = 'bg-pink-500/10 border-b border-pink-200/70';
        idBadge = 'bg-pink-100 text-pink-900 border border-pink-300';
    }

    return `
        <div onclick="navigateToOrderDetail(${order.id})" 
             class="group relative cursor-pointer rounded-xl border border-gray-200/90 bg-white hover:border-blue-400 transition-colors select-none">
            
            <!-- Top Header Bar: Order ID, Date, LC, Split Tag & Actions (Exact Mac Replica) -->
            <div class="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 rounded-t-xl ${headerBg}">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-xs font-black px-2 py-0.5 rounded ${idBadge}">
                        Order #${order.id}
                    </span>
                    <span class="text-xs font-medium text-gray-600 inline-flex items-center gap-1">
                        <i data-lucide="calendar" class="w-3.5 h-3.5 text-gray-500"></i>
                        <span>${order.order_date || '—'}</span>
                    </span>
                    ${order.lc_no ? `
                        <span class="font-mono text-xs text-gray-700 bg-white/80 border border-gray-200 px-2 py-0.5 rounded">
                            LC: <span class="font-bold text-gray-900">${order.lc_no}</span>
                        </span>
                    ` : ''}
                    ${isTwoParts ? `
                        <span class="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            ⚡ Split: P1 (${p1Status}) · P2 (${p2Status})
                        </span>
                    ` : `
                        <span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${statusPill}">
                            <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                            ${status}
                        </span>
                    `}
                    ${isDifferentFactory ? `
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Factory: ${factoryName}
                        </span>
                    ` : ''}
                </div>

                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                    <button onclick="navigateToOrderDetail(${order.id})" class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition">
                        <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600"></i>
                        <span>View Details</span>
                    </button>
                    <button onclick="printOrderInvoiceLegacy(${order.id})" class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition">
                        <i data-lucide="printer" class="w-3.5 h-3.5 text-gray-600"></i>
                        <span>Print</span>
                    </button>
                </div>
            </div>

            <!-- Main Body: 3-column Layout (Col 1: 3 cols, Col 2: 7 cols roomy, Col 3: 2 cols financials) -->
            <div class="p-3">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                    
                    <!-- Col 1: Customer & Supplier -->
                    <div class="md:col-span-3 min-w-0">
                        <p class="font-display text-sm font-bold text-gray-950 truncate leading-snug">
                            ${factoryName}
                        </p>
                        <div class="flex items-center gap-1.5 text-xs text-gray-500 pt-0.5">
                            <span class="text-gray-400">via</span>
                            <span class="font-medium text-gray-700 truncate">${supplierName}</span>
                            ${fileCount > 0 ? `
                                <span class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 shrink-0">
                                    <i data-lucide="paperclip" class="w-3 h-3"></i> ${fileCount}
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Col 2: Shipment Details (7 cols - Roomy for Part 1 & Part 2) -->
                    <div class="md:col-span-7 md:border-l md:border-gray-100 md:pl-3">
                        ${isTwoParts ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <!-- Part 1 Box -->
                                <div class="p-2 rounded-lg border text-[11.5px] leading-snug space-y-1 ${getBoxTheme(p1Status)}">
                                    <div class="flex items-center gap-1.5 border-b border-black/5 pb-1">
                                        <span class="text-[10px] font-black uppercase tracking-wider text-gray-700">Part 1</span>
                                        <span class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[9px] font-bold border ${getPillTheme(p1Status)}">
                                            ${p1Status}
                                        </span>
                                        <span class="font-mono font-black text-gray-900 ml-auto">${(parseFloat(order.part1_qty) || 0).toFixed(2)} MT</span>
                                    </div>
                                    <div class="flex items-center gap-3 text-[11px] text-gray-800">
                                        <span><span class="text-gray-400 text-[10px]">PI:</span> <span class="font-mono font-bold">${order.pi1 || '—'}</span></span>
                                        <span><span class="text-gray-400 text-[10px]">BL:</span> <span class="font-mono font-bold">${order.bl1 || '—'}</span></span>
                                    </div>
                                    <div class="flex items-center gap-3 text-[11px] text-gray-600">
                                        ${order.shipment_date_1 ? `<span><span class="text-gray-400 text-[10px]">ETD:</span> <span class="font-semibold">${order.shipment_date_1}</span></span>` : ''}
                                        ${order.etd_1 ? `<span><span class="text-gray-400 text-[10px]">ETA:</span> <span class="font-bold text-blue-700">${order.etd_1}</span></span>` : ''}
                                    </div>
                                </div>

                                <!-- Part 2 Box -->
                                <div class="p-2 rounded-lg border text-[11.5px] leading-snug space-y-1 ${getBoxTheme(p2Status)}">
                                    <div class="flex items-center gap-1.5 border-b border-black/5 pb-1">
                                        <span class="text-[10px] font-black uppercase tracking-wider text-gray-700">Part 2</span>
                                        <span class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[9px] font-bold border ${getPillTheme(p2Status)}">
                                            ${p2Status}
                                        </span>
                                        <span class="font-mono font-black text-gray-900 ml-auto">${(parseFloat(order.part2_qty) || 0).toFixed(2)} MT</span>
                                    </div>
                                    <div class="flex items-center gap-3 text-[11px] text-gray-800">
                                        <span><span class="text-gray-400 text-[10px]">PI:</span> <span class="font-mono font-bold">${order.pi2 || '—'}</span></span>
                                        <span><span class="text-gray-400 text-[10px]">BL:</span> <span class="font-mono font-bold">${order.bl2 || '—'}</span></span>
                                    </div>
                                    <div class="flex items-center gap-3 text-[11px] text-gray-600">
                                        ${order.shipment_date_2 ? `<span><span class="text-gray-400 text-[10px]">ETD:</span> <span class="font-semibold">${order.shipment_date_2}</span></span>` : ''}
                                        ${order.etd_2 ? `<span><span class="text-gray-400 text-[10px]">ETA:</span> <span class="font-bold text-blue-700">${order.etd_2}</span></span>` : ''}
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div class="text-xs space-y-1">
                                <div class="flex items-center gap-4 text-[11.5px]">
                                    <span><span class="text-gray-400 text-[10px]">PI:</span> <span class="font-mono font-bold text-gray-900">${order.pi1 || order.pi_no || '—'}</span></span>
                                    <span><span class="text-gray-400 text-[10px]">BL:</span> <span class="font-mono font-bold text-gray-800">${order.bl1 || '—'}</span></span>
                                </div>
                                <div class="flex items-center gap-4 text-[11.5px]">
                                    ${order.shipment_date_1 || order.shipment_date ? `
                                        <span class="text-gray-600">
                                            <span class="text-gray-400 text-[10px]">ETD:</span> <span class="font-semibold text-gray-800">${order.shipment_date_1 || order.shipment_date}</span>
                                        </span>
                                    ` : ''}
                                    ${order.etd_1 || order.etd ? `
                                        <span class="text-gray-600">
                                            <span class="text-gray-400 text-[10px]">ETA:</span> <span class="font-semibold text-blue-700 font-bold">${order.etd_1 || order.etd}</span>
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        `}
                    </div>

                    <!-- Col 3: Financials & Totals (2 cols - compact right aligned) -->
                    <div class="md:col-span-2 md:border-l md:border-gray-100 md:pl-2.5 flex flex-col justify-center text-left md:text-right">
                        <div>
                            <span class="font-mono text-xs font-black text-gray-950 block leading-tight">
                                ${qty.toFixed(2)} MT
                            </span>
                            <span class="font-mono text-xs font-bold text-emerald-700 block leading-tight mt-0.5">
                                $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        ${cashback > 0 ? `
                            <p class="font-mono text-[9.5px] font-bold text-pink-700 leading-none mt-1">
                                Cashback: $${cashback.toFixed(2)}
                            </p>
                        ` : ''}
                    </div>

                </div>
            </div>
        </div>
    `;
}

            <!-- Card Bottom Bar: Quick Action Buttons -->
            <div class="pt-2 border-t border-gray-100 flex items-center justify-between" onclick="event.stopPropagation()">
                <button onclick="navigateToOrderDetail(${order.id})" class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
                    <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                    <span>View Full Details &amp; Products</span>
                </button>
                <button onclick="printOrderInvoiceLegacy(${order.id})" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition">
                    <i data-lucide="printer" class="w-3.5 h-3.5 text-gray-600"></i>
                    <span>Print Order</span>
                </button>
            </div>
        </div>
    `;
}

// Clean Dedicated Order Detail Page
function renderOrderDetailPage(order) {
    const content = document.getElementById('customerPortalBody');
    if (!content) return;

    const status = order.status || 'Pending';
    let statusPill = 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'Delivered') statusPill = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (status === 'Shipped') statusPill = 'bg-sky-50 text-sky-700 border-sky-200';
    else if (status === 'In Production' || status === 'Confirmed' || status === 'Completed') statusPill = 'bg-pink-50 text-pink-700 border-pink-200';
    else if (status === 'Cancelled') statusPill = 'bg-rose-50 text-rose-700 border-rose-200';

    const qty = getOrderActualQty(order);
    const amount = getOrderTotalAmount(order);
    const cashback = getOrderCashback(order);
    const items = order.items || [];
    const files = order.files || [];
    const notes = order.customer_notes || [];
    const piDisplay = order.pi1 ? (order.bl_count === 2 && order.pi2 ? `${order.pi1} / ${order.pi2}` : order.pi1) : (order.pi_no || 'N/A');

    const supplier = allSuppliers.find(s => s.id === order.supplier_id);
    const supplierName = supplier?.name || 'International Supplier';

    const isDifferentFactory = order.portal_customer_id && Number(order.portal_customer_id) === Number(currentCustomer.id) && Number(order.customer_id) !== Number(currentCustomer.id);
    const factoryCustomer = isDifferentFactory ? allCustomers.find(c => c.id === Number(order.customer_id)) : currentCustomer;
    const factoryName = factoryCustomer?.name || currentCustomer.name;

    content.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <!-- Top Navigation & Print Order Button -->
            <div class="flex items-center justify-between pb-3 border-b border-gray-200">
                <button onclick="navigateBackToOrdersList()" 
                        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Order List
                </button>
                <div class="flex items-center gap-2">
                    <button onclick="printOrderInvoiceLegacy(${order.id})" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition">
                        <i data-lucide="printer" class="w-4 h-4"></i>
                        <span>Print Order</span>
                    </button>
                </div>
            </div>

            <!-- Order Header Card (Clean, Simple, Professional) -->
            <div class="bg-gradient-to-r from-navy-950 to-navy-900 text-white p-5 sm:p-6 rounded-2xl border border-navy-800 shadow-md">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-2 flex-wrap mb-1.5">
                            <span class="text-xs uppercase tracking-widest text-brand-gold font-bold">Roza Indent Order</span>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusPill}">${status}</span>
                            ${isDifferentFactory ? `
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-navy-950">
                                    Factory: ${factoryName}
                                </span>
                            ` : ''}
                        </div>
                        <h2 class="text-2xl font-extrabold font-display">Order #${order.id}</h2>
                        <div class="text-xs text-gray-300 mt-1.5 space-y-1">
                            <p><strong>Factory:</strong> <span class="text-white">${factoryName}</span></p>
                            <p><strong>Supplier:</strong> <span class="text-white">${supplierName}</span></p>
                            <p><strong>Order Date:</strong> ${order.order_date || 'N/A'}${order.lc_no ? ` · <strong>LC:</strong> ${order.lc_no}` : ''} · <strong>PI:</strong> ${piDisplay}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 text-right bg-white/10 p-3.5 rounded-xl border border-white/15">
                        <div>
                            <p class="text-[10px] uppercase font-bold text-gray-300">Total Quantity</p>
                            <p class="text-lg sm:text-xl font-extrabold text-white">${qty.toFixed(2)} MT</p>
                        </div>
                        <div>
                            <p class="text-[10px] uppercase font-bold text-gray-300">Total USD</p>
                            <p class="text-lg sm:text-xl font-extrabold text-emerald-400">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Ordered Products Table (Clear, Clean Columns) -->
            <div>
                <h3 class="font-bold text-xs uppercase tracking-wider text-gray-700 mb-2 font-display">
                    Products &amp; Specifications
                </h3>
                <div class="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
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

            <!-- Shipment & Milestone Info Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="p-4 bg-white rounded-2xl border border-gray-200 space-y-1.5 text-xs shadow-xs">
                    <span class="text-[10px] font-bold uppercase text-gray-400">LC &amp; Reference Details</span>
                    <p><strong>LC Number:</strong> ${order.lc_no || 'Pending'}</p>
                    <p><strong>PI 1:</strong> ${order.pi1 || 'N/A'}</p>
                    ${order.bl_count === 2 ? `<p><strong>PI 2:</strong> ${order.pi2 || 'N/A'}</p>` : ''}
                </div>

                <div class="p-4 bg-white rounded-2xl border border-gray-200 space-y-2 text-xs shadow-xs">
                    <span class="text-[10px] font-bold uppercase text-gray-400">Shipment Milestones</span>
                    ${order.bl_count === 2 ? `
                        <div class="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
                            <div class="flex items-center justify-between font-bold text-gray-900">
                                <span>Part 1 (${parseFloat(order.part1_qty) || 0} MT)</span>
                                <span class="text-[9px] uppercase px-1.5 py-0.5 rounded ${getPortalPartStatus(order, 1) === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : getPortalPartStatus(order, 1) === 'Shipped' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}">${getPortalPartStatus(order, 1)}</span>
                            </div>
                            <p><strong>ETD:</strong> ${order.shipment_date_1 || 'N/A'} · <strong>ETA:</strong> <span class="font-bold text-blue-700">${order.etd_1 || 'N/A'}</span></p>
                            ${order.bl1 ? `<p><strong>BL No:</strong> <span class="font-mono text-gray-800">${order.bl1}</span></p>` : ''}
                            ${order.dhl_tracking_1 ? `<p><strong>DHL:</strong> ${order.dhl_tracking_1}</p>` : ''}
                        </div>
                        <div class="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1 mt-1">
                            <div class="flex items-center justify-between font-bold text-gray-900">
                                <span>Part 2 (${parseFloat(order.part2_qty) || 0} MT)</span>
                                <span class="text-[9px] uppercase px-1.5 py-0.5 rounded ${getPortalPartStatus(order, 2) === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : getPortalPartStatus(order, 2) === 'Shipped' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}">${getPortalPartStatus(order, 2)}</span>
                            </div>
                            <p><strong>ETD:</strong> ${order.shipment_date_2 || 'N/A'} · <strong>ETA:</strong> <span class="font-bold text-blue-700">${order.etd_2 || 'N/A'}</span></p>
                            ${order.bl2 ? `<p><strong>BL No:</strong> <span class="font-mono text-gray-800">${order.bl2}</span></p>` : ''}
                            ${order.dhl_tracking_2 ? `<p><strong>DHL:</strong> ${order.dhl_tracking_2}</p>` : ''}
                        </div>
                    ` : `
                        <p><strong>ETD (Shipment):</strong> ${order.shipment_date_1 || order.shipment_date || 'N/A'}</p>
                        <p><strong>ETA (Arrival Date):</strong> <span class="font-bold text-blue-700">${order.etd_1 || order.etd || 'N/A'}</span></p>
                        ${order.bl1 ? `<p><strong>BL No:</strong> <span class="font-mono text-gray-800">${order.bl1}</span></p>` : ''}
                        <p><strong>DHL Express:</strong> ${order.dhl_tracking_1 || order.dhl_tracking || 'N/A'}</p>
                    `}
                </div>

                <div class="p-4 bg-white rounded-2xl border border-gray-200 space-y-1.5 text-xs shadow-xs">
                    <span class="text-[10px] font-bold uppercase text-gray-400">Commercial &amp; Tracking</span>
                    <p><strong>Cashback:</strong> <span class="font-bold text-pink-600">${cashback > 0 ? `$${cashback.toFixed(2)}` : 'None'}</span></p>
                    ${order.tracking_link ? `
                        <p class="truncate pt-1">
                            <strong>Live Tracking:</strong> 
                            <a href="${order.tracking_link}" target="_blank" class="text-blue-600 underline">Track Vessel Link</a>
                        </p>
                    ` : '<p class="text-gray-400">Vessel tracking link not assigned yet.</p>'}
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
