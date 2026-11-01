// ROZA INTERNATIONAL - Customer Portal Implementation
const SB_URL = 'https://secvddpmfkudsahdkgfx.supabase.co';
const SB_KEY = 'sb_publishable_9OXdSbpr3mrb5QqYK29oog_ugQ53GMh';

let currentCustomer = null;
let customerOrders = [];

function openCustomerPortalModal() {
    const modal = document.getElementById('customerPortalModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Check if session exists in sessionStorage
    const saved = sessionStorage.getItem('roza_portal_cust');
    if (saved) {
        try {
            currentCustomer = JSON.parse(saved);
            renderPortalDashboard();
            return;
        } catch (e) {}
    }
    renderPortalLogin();
}

function closeCustomerPortalModal() {
    const modal = document.getElementById('customerPortalModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function customerPortalLogout() {
    currentCustomer = null;
    customerOrders = [];
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

            <form id="portalLoginForm" onsubmit="handlePortalLogin(event)" class="bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
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
                    Don't have your portal password yet? Please contact our sales desk or reach out via WhatsApp at +880 1970 026390.
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
        // Fetch customers list
        const res = await fetch(`${SB_URL}/rest/v1/app_data?key=eq.agent_customers&select=data`, {
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
        });
        const rows = await res.json();
        const customers = (Array.isArray(rows) && rows[0]?.data) ? rows[0].data : [];

        // Match customer by phone or email
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

        // If multiple parties share the same phone/email (e.g. Sister concerns), prioritize the one with portal enabled or matching password
        let found = matchingCustomers.find(c => Boolean(c.portal_enabled) && String(c.portal_password).trim() === password);
        
        if (!found) {
            // Check if any has portal enabled
            const enabledOne = matchingCustomers.find(c => Boolean(c.portal_enabled));
            if (!enabledOne) {
                throw new Error('Portal access is not enabled for your account. Please contact Roza International support.');
            }
            if (String(enabledOne.portal_password).trim() !== password) {
                throw new Error('Incorrect portal password. Please check and try again.');
            }
            found = enabledOne;
        }

        // Login successful!
        currentCustomer = found;
        sessionStorage.setItem('roza_portal_cust', JSON.stringify(found));
        const headerLogout = document.getElementById('portalHeaderLogoutBtn');
        if (headerLogout) headerLogout.classList.remove('hidden');
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

async function renderPortalDashboard() {
    const content = document.getElementById('customerPortalBody');
    if (!content) return;

    content.innerHTML = `
        <div class="py-10 text-center">
            <div class="inline-block animate-spin text-2xl mb-2">⏳</div>
            <p class="text-sm font-semibold text-gray-600">Loading your orders securely...</p>
        </div>
    `;

    try {
        const res = await fetch(`${SB_URL}/rest/v1/app_data?key=eq.agent_orders&select=data`, {
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
        });
        const rows = await res.json();
        const allOrders = (Array.isArray(rows) && rows[0]?.data) ? rows[0].data : [];

        // Filter orders for this customer and where portal_visible is true
        customerOrders = allOrders.filter(o => 
            Number(o.customer_id) === Number(currentCustomer.id) &&
            o.portal_visible !== false
        ).sort((a, b) => (b.order_date || '').localeCompare(a.order_date || ''));

        renderOrdersList();
        const headerLogout = document.getElementById('portalHeaderLogoutBtn');
        if (headerLogout) headerLogout.classList.remove('hidden');
    } catch (err) {
        content.innerHTML = `
            <div class="p-6 text-center text-rose-600 bg-rose-50 rounded-xl">
                <p class="font-bold">Failed to load orders</p>
                <p class="text-xs mt-1">${err.message}</p>
                <button onclick="renderPortalDashboard()" class="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold">Try Again</button>
            </div>
        `;
    }
}

function renderOrdersList() {
    const content = document.getElementById('customerPortalBody');
    if (!content) return;

    const totalTons = customerOrders.reduce((sum, o) => {
        const lineSum = (o.items || []).reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
        return sum + (o.total_quantity || lineSum || 0);
    }, 0);

    const deliveredCount = customerOrders.filter(o => o.status === 'Delivered').length;

    content.innerHTML = `
        <div class="space-y-6">
            <!-- Customer Welcome Header -->
            <div class="bg-gradient-to-r from-navy-900 to-navy-800 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-navy-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/30 mb-1.5">
                        <i data-lucide="shield" class="w-3 h-3"></i> Client Portal
                    </span>
                    <h3 class="text-lg sm:text-xl font-bold font-display">${currentCustomer.name}</h3>
                    <p class="text-xs text-gray-300 mt-0.5">${currentCustomer.owner ? currentCustomer.owner + ' · ' : ''}${currentCustomer.phone || currentCustomer.email || ''}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="renderPortalDashboard()" class="px-3 py-1.5 rounded-lg bg-navy-700/80 hover:bg-navy-700 text-xs font-semibold text-gray-200 border border-navy-600 flex items-center gap-1.5 transition">
                        <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
                    </button>
                    <button onclick="customerPortalLogout()" class="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition">
                        <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Log Out
                    </button>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                    <p class="text-[10.5px] uppercase font-bold text-gray-400">Total Orders</p>
                    <p class="text-xl font-extrabold text-gray-900 mt-0.5">${customerOrders.length}</p>
                </div>
                <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                    <p class="text-[10.5px] uppercase font-bold text-gray-400">Total Quantity</p>
                    <p class="text-xl font-extrabold text-blue-600 mt-0.5">${totalTons.toFixed(2)} <span class="text-xs font-semibold text-gray-500">tons</span></p>
                </div>
                <div class="col-span-2 sm:col-span-1 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                    <p class="text-[10.5px] uppercase font-bold text-gray-400">Delivered</p>
                    <p class="text-xl font-extrabold text-emerald-600 mt-0.5">${deliveredCount} <span class="text-xs font-semibold text-gray-500">Orders</span></p>
                </div>
            </div>

            <!-- Orders List -->
            <div>
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-sm text-gray-800 uppercase tracking-wider font-display">My Indent Orders</h4>
                    <span class="text-xs text-gray-400">Read-Only View · Real-Time</span>
                </div>

                ${customerOrders.length === 0 ? `
                    <div class="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
                        <i data-lucide="inbox" class="w-10 h-10 mx-auto text-gray-300 mb-2"></i>
                        <p class="font-semibold text-sm">No orders assigned for portal view yet</p>
                        <p class="text-xs text-gray-400 mt-1">Orders approved by Roza International will appear here.</p>
                    </div>
                ` : `
                    <div class="space-y-4">
                        ${customerOrders.map(order => renderOrderCard(order)).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderOrderCard(order) {
    const status = order.status || 'Pending';
    let statusClass = 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'Delivered') statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (status === 'Shipped') statusClass = 'bg-blue-50 text-blue-700 border-blue-200';
    else if (status === 'Completed') statusClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    else if (status === 'Cancelled') statusClass = 'bg-rose-50 text-rose-700 border-rose-200';

    const items = order.items || [];
    const files = order.files || [];
    const notes = order.customer_notes || [];

    return `
        <div class="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs hover:border-blue-300 transition space-y-4">
            <!-- Header -->
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div class="flex items-center gap-2.5">
                    <div class="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-100">
                        #${order.id}
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-sm text-gray-900">Order #${order.id}</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}">${status}</span>
                        </div>
                        <p class="text-[11px] text-gray-400 mt-0.5">Order Date: ${order.order_date || 'N/A'}${order.lc_no ? ' · LC: ' + order.lc_no : ''}</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button onclick="printOrderInvoice(${order.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition">
                        <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print / PDF Memo
                    </button>
                </div>
            </div>

            <!-- Products Table -->
            ${items.length > 0 ? `
                <div class="overflow-x-auto rounded-xl border border-gray-100 bg-gray-50/50">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-gray-100/70 text-gray-500 uppercase text-[10px] tracking-wider font-semibold">
                            <tr>
                                <th class="py-2 px-3">Item / Grade</th>
                                <th class="py-2 px-3">Size</th>
                                <th class="py-2 px-3">GSM</th>
                                <th class="py-2 px-3 text-right">Qty</th>
                                <th class="py-2 px-3 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${items.map(it => `
                                <tr>
                                    <td class="py-2 px-3 font-semibold text-gray-800">${it.product_name || it.product_id || 'Industrial Paper/Polymer'}</td>
                                    <td class="py-2 px-3 text-gray-600">${it.size || '—'}</td>
                                    <td class="py-2 px-3 text-gray-600">${it.gsm ? it.gsm + ' GSM' : '—'}</td>
                                    <td class="py-2 px-3 text-right font-bold text-gray-800">${it.quantity || 0} tons</td>
                                    <td class="py-2 px-3 text-right font-medium text-gray-600">$${it.price || 0}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            <!-- Shipment & Tracking Info -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                    <span class="text-gray-400 block text-[10px] uppercase font-bold">PI & Shipping Details</span>
                    <p class="font-medium text-gray-800 mt-0.5">
                        PI: ${order.pi1 || order.pi_no || 'Pending'}
                        ${order.bl1 ? ' · BL: ' + order.bl1 : ''}
                    </p>
                    ${order.shipment_date_1 ? `<p class="text-gray-500 text-[11px] mt-0.5">ETD: ${order.shipment_date_1}</p>` : ''}
                </div>
                <div>
                    <span class="text-gray-400 block text-[10px] uppercase font-bold">Delivery Status</span>
                    <p class="font-semibold text-gray-800 mt-0.5">
                        ${order.status === 'Delivered' 
                            ? `Delivered on ${order.delivery_date_1 || order.delivery_date || 'Confirmed'}` 
                            : 'In Transit / Awaiting Arrival'}
                    </p>
                    ${order.dhl_tracking_1 ? `<p class="text-blue-600 text-[11px] mt-0.5">Courier/DHL: ${order.dhl_tracking_1}</p>` : ''}
                </div>
            </div>

            <!-- Documents / Attachments Download -->
            ${files.length > 0 ? `
                <div class="pt-1">
                    <span class="text-[11px] font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Official Documents & Attachments</span>
                    <div class="flex flex-wrap gap-2">
                        ${files.map(f => `
                            <a href="${f.webViewLink || f.url || '#'}" target="_blank" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium border border-blue-200 transition">
                                <i data-lucide="paperclip" class="w-3 h-3 text-blue-600"></i>
                                <span class="truncate max-w-[200px]">${f.label || f.name}</span>
                                <i data-lucide="download" class="w-2.5 h-2.5 opacity-60"></i>
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Customer Notes / Feedback Section -->
            <div class="pt-2 border-t border-gray-100">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                        <i data-lucide="message-square" class="w-3.5 h-3.5 text-blue-600"></i> My Remarks / Notes on this Order
                    </span>
                    <button onclick="toggleNoteInput(${order.id})" class="text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                        + Add Note
                    </button>
                </div>

                ${notes.length > 0 ? `
                    <div class="space-y-1.5 mb-2">
                        ${notes.map(n => `
                            <div class="bg-blue-50/60 border border-blue-100 rounded-lg p-2 text-xs text-gray-800">
                                <div class="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                    <span class="font-semibold text-blue-700">Client Note</span>
                                    <span>${n.date ? n.date.slice(0, 10) : ''}</span>
                                </div>
                                <p>${n.text}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p class="text-[11px] text-gray-400 italic">No notes added yet. Need special delivery instructions? Leave a note.</p>
                `}

                <div id="noteBox-${order.id}" class="hidden mt-2 space-y-2">
                    <textarea id="noteInput-${order.id}" rows="2" placeholder="Write any instruction or note for Roza International team..."
                              class="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"></textarea>
                    <div class="flex justify-end gap-2">
                        <button onclick="toggleNoteInput(${order.id})" class="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onclick="submitCustomerNote(${order.id})" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">Save Note</button>
                    </div>
                </div>
            </div>
        </div>
    `;
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

        // Fetch full orders list from Supabase
        const res = await fetch(`${SB_URL}/rest/v1/app_data?key=eq.agent_orders&select=data`, {
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
        });
        const rows = await res.json();
        const allOrders = (Array.isArray(rows) && rows[0]?.data) ? rows[0].data : [];

        const updatedAll = allOrders.map(o => o.id === orderId ? { ...o, customer_notes: updatedNotes } : o);

        // Update in Supabase
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
        renderOrdersList();
        const headerLogout = document.getElementById('portalHeaderLogoutBtn');
        if (headerLogout) headerLogout.classList.remove('hidden');
    } catch (err) {
        alert('Could not save note: ' + err.message);
    }
}

function printOrderInvoice(orderId) {
    const order = customerOrders.find(o => o.id === orderId);
    if (!order) return;

    const items = order.items || [];
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to print/download invoice.');
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Order Memo #${order.id} - Roza International</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #111; }
                .header { border-bottom: 2px solid #00508F; padding-bottom: 15px; margin-bottom: 20px; }
                .logo-row { display: flex; justify-content: space-between; align-items: center; }
                .company-name { font-size: 20px; font-weight: bold; color: #00508F; }
                .company-sub { font-size: 11px; color: #555; }
                .order-meta { text-align: right; }
                .order-title { font-size: 16px; font-weight: bold; color: #00508F; }
                .party-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
                th { background: #00508F; color: #fff; padding: 8px 10px; text-align: left; }
                td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
                .text-right { text-align: right; }
                .status-pill { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; background: #e0f2fe; color: #0369a1; }
                .footer { margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 11px; color: #64748b; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-row">
                    <div>
                        <div class="company-name">ROZA INTERNATIONAL</div>
                        <div class="company-sub">Global Indenting Solutions &amp; Trade Representation</div>
                        <div class="company-sub">49/1/B, Purana Paltan Lane, Dhaka · Phone: +880 1970 026390</div>
                    </div>
                    <div class="order-meta">
                        <div class="order-title">ORDER MEMO #${order.id}</div>
                        <div class="company-sub">Date: ${order.order_date || 'N/A'}</div>
                        <div style="margin-top: 4px;"><span class="status-pill">${order.status || 'Pending'}</span></div>
                    </div>
                </div>
            </div>

            <div class="party-box">
                <strong>Customer:</strong> ${currentCustomer.name}<br>
                ${currentCustomer.address ? `<strong>Address:</strong> ${currentCustomer.address}<br>` : ''}
                ${currentCustomer.phone ? `<strong>Phone:</strong> ${currentCustomer.phone} · ` : ''}
                ${currentCustomer.email ? `<strong>Email:</strong> ${currentCustomer.email}` : ''}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item / Specification</th>
                        <th>Size</th>
                        <th>GSM</th>
                        <th class="text-right">Quantity</th>
                        <th class="text-right">Unit Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(it => `
                        <tr>
                            <td><strong>${it.product_name || it.product_id || 'Paper/Polymer'}</strong></td>
                            <td>${it.size || '—'}</td>
                            <td>${it.gsm ? it.gsm + ' GSM' : '—'}</td>
                            <td class="text-right"><strong>${it.quantity || 0} tons</strong></td>
                            <td class="text-right">$${it.price || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="party-box">
                <strong>PI / BL Details:</strong> PI #${order.pi1 || order.pi_no || 'N/A'} ${order.bl1 ? `· BL #${order.bl1}` : ''} ${order.lc_no ? `· LC: ${order.lc_no}` : ''}<br>
                <strong>Shipment &amp; Delivery:</strong> ${order.status === 'Delivered' ? 'Delivery Completed' : 'In Progress / Shipment Tracking'}
            </div>

            <div class="footer">
                This is a computer-generated client memo from Roza International Customer Portal. For inquiries, contact: info@rozainternational.com
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
}
