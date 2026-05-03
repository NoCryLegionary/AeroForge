/**
 * AeroForge — Market, Passive Income & Achievements
 * Order rendering/acceptance, passive income ticks, random events, achievement checks.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    // =============================================
    // MARKET ORDERS
    // =============================================

    function renderMarketFull() {
        var grid = document.getElementById('marketGrid');
        if (!grid) return;
        grid.innerHTML = '';

        var marketData = AF.marketData;
        var gameState = AF.gameState;

        for (var i = 0; i < marketData.length; i++) {
            var order = marketData[i];
            var canFulfill = gameState.completedAircrafts.some(function(ac) {
                return ac.stats.range >= (order.requirements.range || 0) &&
                       ac.stats.capacity >= (order.requirements.capacity || 0) &&
                       ac.stats.speed >= (order.requirements.speed || 0);
            });

            var reqText = Object.keys(order.requirements).map(function(k) {
                return AF.getStatName(k) + ': ' + order.requirements[k];
            }).join(', ');

            var card = document.createElement('div');
            card.className = 'research-card';
            card.innerHTML =
                '<div class="research-icon">📋</div>' +
                '<div class="research-name">' + AF.escapeHtml(order.customer) + '</div>' +
                '<div class="research-desc">' +
                    '<strong>Talep:</strong> ' + AF.escapeHtml(order.type) + ' uçağı x' + order.quantity + '<br>' +
                    '<strong>Gereksinimler:</strong> ' + AF.escapeHtml(reqText) + '<br>' +
                    '<strong>Teslimat:</strong> ' + order.deadline + ' gün' +
                '</div>' +
                '<div class="research-cost">' +
                    '<div class="cost-item">' +
                        '<div class="cost-label">Toplam Gelir</div>' +
                        '<div class="cost-value" style="color:var(--success);">' + AF.formatMoney(order.price) + '</div>' +
                    '</div>' +
                '</div>' +
                '<button class="research-btn" data-action="accept-order" data-order-id="' + order.id + '"' +
                    (!canFulfill ? ' disabled' : '') + '>' +
                    (canFulfill ? '✅ Siparişi Kabul Et' : '⛔ Uygun Uçak Yok') +
                '</button>';
            grid.appendChild(card);
        }
    }

    // BUG-09 FIX: Order tracking with delivery requirement
    function acceptOrder(orderId) {
        var marketData = AF.marketData;
        var gameState = AF.gameState;

        var orderIndex = -1;
        for (var i = 0; i < marketData.length; i++) {
            if (marketData[i].id === orderId) { orderIndex = i; break; }
        }
        if (orderIndex === -1) return;

        var order = marketData[orderIndex];
        var upfront = order.price * 0.2;

        AF.showModal('Sipariş Onayı',
            '<div style="text-align:center;padding:20px;">' +
                '<div style="font-size:3rem;margin-bottom:20px;">🎉</div>' +
                '<h3 style="color:var(--success);margin-bottom:15px;">Sipariş Alındı!</h3>' +
                '<p>' + AF.escapeHtml(order.customer) + ' ile ' + AF.formatMoney(order.price) + ' değerinde sözleşme imzaladınız.</p>' +
                '<p style="margin-top:10px;color:var(--primary);">Peşinat: ' + AF.formatMoney(upfront) + '</p>' +
                '<p style="margin-top:15px;color:var(--warning);">Üretim hattında ' + order.quantity + ' adet üretim planlayın. Teslimatta kalan ' + AF.formatMoney(order.price * 0.8) + ' ödenecek.</p>' +
            '</div>'
        );

        gameState.budget += upfront;
        gameState.prestige += 20;

        gameState.activeOrders.push({
            id: order.id,
            customer: order.customer,
            type: order.type,
            quantity: order.quantity,
            price: order.price,
            delivered: 0,
            deadline: order.deadline
        });

        marketData.splice(orderIndex, 1);
        AF.dirty.stats = true;
        AF.dirty.activeOrders = true;

        AF.TimerManager.setTimeout('market-refresh', function() {
            AF.dirty.marketFull = true;
        }, 2000);
    }

    function renderActiveOrders() {
        var card = document.getElementById('activeOrdersCard');
        var list = document.getElementById('activeOrdersList');
        if (!card || !list) return;

        var orders = AF.gameState.activeOrders;

        if (orders.length === 0) {
            card.style.display = 'none';
            return;
        }

        card.style.display = 'block';
        list.innerHTML = '';

        for (var i = 0; i < orders.length; i++) {
            var order = orders[i];
            var percent = order.quantity > 0 ? (order.delivered / order.quantity * 100) : 0;
            var item = document.createElement('div');
            item.className = 'active-order-item';
            item.innerHTML =
                '<div class="order-name">' + AF.escapeHtml(order.customer) + '</div>' +
                '<div style="font-size:0.8rem;color:rgba(255,255,255,0.6);margin-top:4px;">' +
                    AF.escapeHtml(order.type) + ' — ' + order.delivered + '/' + order.quantity + ' teslim' +
                '</div>' +
                '<div class="order-progress"><div class="order-progress-bar" style="width:' + percent + '%"></div></div>';
            list.appendChild(item);
        }
    }

    // =============================================
    // PASSIVE INCOME & RANDOM EVENTS
    // =============================================

    function processPassiveIncome() {
        var gameState = AF.gameState;
        if (gameState.production > 0) {
            var income = gameState.production * 10000;
            gameState.budget += income;
            AF.dirty.stats = true;
        }
    }

    function processMarketFluctuation() {
        if (Math.random() > 0.95) {
            var events = [
                { msg: '💰 Hükümet havacılık sektörüne teşvik veriyor! Bütçe +$500K', budgetDelta: 500000, prestigeDelta: 0 },
                { msg: '📈 Yeni hava yolu şirketi kuruldu! Sipariş beklentisi arttı.', budgetDelta: 0, prestigeDelta: 0 },
                { msg: '⚠️ Küresel çip krizi! Üretim maliyetleri arttı.', budgetDelta: -100000, prestigeDelta: 0 },
                { msg: '🎉 Uluslararası havacılık fuarı! Prestij +20', budgetDelta: 0, prestigeDelta: 20 }
            ];
            var ev = events[Math.floor(Math.random() * events.length)];
            AF.addNotification(ev.msg);
            AF.gameState.budget += ev.budgetDelta;
            AF.gameState.prestige += ev.prestigeDelta;
            AF.dirty.stats = true;
        }
    }

    // =============================================
    // ACHIEVEMENTS
    // =============================================

    function checkAchievements() {
        var achDiv = document.getElementById('achievements');
        if (!achDiv) return;

        var gameState = AF.gameState;

        var checks = [
            { key: 'rising_star', threshold: function() { return gameState.prestige >= 100; }, label: '⭐ Yükselen Yıldız', color: 'success' },
            { key: 'manufacturer', threshold: function() { return gameState.production >= 10; }, label: '🏭 Seri Üretici', color: 'secondary' },
            { key: 'tycoon', threshold: function() { return gameState.budget >= 50000000; }, label: '💎 Havacılık Devi', color: 'warning' },
            { key: 'researcher', threshold: function() { return gameState.unlockedTechs.length >= 5; }, label: '🧠 Araştırma Ustası', color: 'primary' }
        ];

        for (var i = 0; i < checks.length; i++) {
            var ach = checks[i];
            if (ach.threshold() && gameState.achievements.indexOf(ach.key) === -1) {
                var colorMap = { success: 'var(--success)', secondary: 'var(--secondary)', warning: 'var(--warning)', primary: 'var(--primary)' };
                var badge = document.createElement('span');
                badge.style.cssText = 'padding:8px 15px;background:rgba(0,212,255,0.2);border-radius:20px;font-size:0.85rem;border:1px solid ' + (colorMap[ach.color] || 'var(--primary)') + ';animation:slideIn 0.5s ease;';
                badge.textContent = ach.label;
                achDiv.appendChild(badge);
                AF.addNotification('🏆 Yeni Başarım: ' + ach.label + '!');
                gameState.achievements.push(ach.key);
            }
        }
    }

    // Expose
    AF.renderMarketFull = renderMarketFull;
    AF.acceptOrder = acceptOrder;
    AF.renderActiveOrders = renderActiveOrders;
    AF.processPassiveIncome = processPassiveIncome;
    AF.processMarketFluctuation = processMarketFluctuation;
    AF.checkAchievements = checkAchievements;

})(window.AeroForge);
