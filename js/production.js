/**
 * AeroForge — Production System
 * Assembly line rendering, progress tracking, aircraft assignment, production completion.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    var PRODUCTION_DURATION = 50000;

    function renderProductionFull() {
        var container = document.getElementById('productionLines');
        if (!container) return;
        container.innerHTML = '';

        var gameState = AF.gameState;

        for (var i = 0; i < gameState.productionLines.length; i++) {
            var line = gameState.productionLines[i];
            var statusClass = line.status === 'idle' ? 'status-idle' : line.status === 'working' ? 'status-working' : 'status-offline';
            var statusText = line.status === 'idle' ? 'Boşta' : line.status === 'working' ? 'Üretimde' : 'Kapalı';

            var station = document.createElement('div');
            station.className = 'production-station';
            station.setAttribute('data-line-index', i);
            station.innerHTML =
                '<div class="station-header">' +
                    '<div class="station-name">' + AF.escapeHtml(line.name) + '</div>' +
                    '<div class="station-status ' + statusClass + '">' + statusText + '</div>' +
                '</div>' +
                '<div class="station-progress">' +
                    '<div class="station-progress-bar" id="prod-progress-' + i + '" style="width:' + line.progress + '%"></div>' +
                '</div>' +
                '<div class="station-info">' +
                    '<span id="prod-info-' + i + '">İlerleme: ' + line.progress.toFixed(1) + '%</span>' +
                    '<span>' + (line.aircraft ? AF.escapeHtml(line.aircraft.name) : 'Bekliyor') + '</span>' +
                '</div>' +
                '<div class="station-actions">' +
                    '<button class="btn-small" data-action="select-production" data-line="' + i + '"' +
                        (line.status === 'working' ? ' disabled' : '') + '>✈️ Uçak Seç</button>' +
                    '<button class="btn-small" data-action="toggle-production" data-line="' + i + '"' +
                        (!line.aircraft ? ' disabled' : '') + '>' +
                        (line.status === 'working' ? '⏸️ Durdur' : '▶️ Başlat') +
                    '</button>' +
                '</div>';
            container.appendChild(station);
        }
    }

    function updateProductionProgressUI() {
        var lines = AF.gameState.productionLines;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.status !== 'working') continue;
            var bar = document.getElementById('prod-progress-' + i);
            var info = document.getElementById('prod-info-' + i);
            if (bar) bar.style.width = line.progress + '%';
            if (info) info.textContent = 'İlerleme: ' + line.progress.toFixed(1) + '%';
        }
    }

    function updateProductionProgress(dt) {
        var lines = AF.gameState.productionLines;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.status !== 'working' || !line.aircraft) continue;

            var increment = (dt / PRODUCTION_DURATION) * 100;
            line.progress = Math.min(100, line.progress + increment);
            AF.dirty.productionProgress = true;

            if (line.progress >= 100) {
                completeProduction(i);
            }
        }
    }

    function selectAircraftForProduction(lineIndex) {
        var gameState = AF.gameState;
        if (gameState.completedAircrafts.length === 0) {
            AF.showModal('Tasarım Yok', 'Önce Tasarım bölümünden bir uçak tasarlayın!');
            return;
        }

        var html = '<div style="display:flex;flex-direction:column;gap:15px;">';
        for (var i = 0; i < gameState.completedAircrafts.length; i++) {
            var ac = gameState.completedAircrafts[i];
            html +=
                '<div style="padding:15px;background:rgba(0,212,255,0.1);border-radius:10px;cursor:pointer;border:1px solid rgba(0,212,255,0.3);"' +
                ' data-action="assign-to-line" data-line="' + lineIndex + '" data-aircraft="' + i + '">' +
                    '<div style="font-family:Orbitron;color:var(--primary);margin-bottom:5px;">' + AF.escapeHtml(ac.name) + '</div>' +
                    '<div style="font-size:0.9rem;color:rgba(255,255,255,0.7);">' +
                        'Hız: ' + ac.stats.speed + ' km/s | Menzil: ' + ac.stats.range + ' km | ' +
                        'Maliyet: ' + AF.formatMoney(ac.cost) +
                    '</div>' +
                '</div>';
        }
        html += '</div>';
        AF.showModal('Üretim İçin Uçak Seç', html);
    }

    function assignToLine(lineIndex, aircraftIndex) {
        var gameState = AF.gameState;
        gameState.productionLines[lineIndex].aircraft = gameState.completedAircrafts[aircraftIndex];
        gameState.productionLines[lineIndex].progress = 0;
        AF.dirty.productionFull = true;
    }

    function toggleProduction(lineIndex) {
        var line = AF.gameState.productionLines[lineIndex];
        if (line.status === 'idle' && line.aircraft) {
            line.status = 'working';
            line.progress = 0;
        } else if (line.status === 'working') {
            line.status = 'idle';
        }
        AF.dirty.productionFull = true;
    }

    function completeProduction(lineIndex) {
        var gameState = AF.gameState;
        var line = gameState.productionLines[lineIndex];
        var aircraft = line.aircraft;
        if (!aircraft) return;

        gameState.production += 1;
        var revenue = aircraft.cost * 0.3;
        gameState.budget += revenue;
        gameState.prestige += 5;

        // BUG-09 FIX: Fulfill active orders
        for (var i = 0; i < gameState.activeOrders.length; i++) {
            var order = gameState.activeOrders[i];
            if (order.delivered < order.quantity) {
                order.delivered += 1;
                if (order.delivered >= order.quantity) {
                    var remaining = order.price * 0.8;
                    gameState.budget += remaining;
                    gameState.prestige += 30;
                    AF.addNotification('🎉 ' + AF.escapeHtml(order.customer) + ' siparişi tamamlandı! +' + AF.formatMoney(remaining));
                    AF.dirty.activeOrders = true;
                }
                break;
            }
        }

        AF.addNotification('✅ ' + AF.escapeHtml(aircraft.name) + ' üretimi tamamlandı! Satıştan ' + AF.formatMoney(revenue) + ' kazanç.');

        line.status = 'idle';
        line.progress = 0;
        line.aircraft = null;

        AF.dirty.productionFull = true;
        AF.dirty.stats = true;
        AF.dirty.activeOrders = true;
    }

    // Expose
    AF.PRODUCTION_DURATION = PRODUCTION_DURATION;
    AF.renderProductionFull = renderProductionFull;
    AF.updateProductionProgressUI = updateProductionProgressUI;
    AF.updateProductionProgress = updateProductionProgress;
    AF.selectAircraftForProduction = selectAircraftForProduction;
    AF.assignToLine = assignToLine;
    AF.toggleProduction = toggleProduction;

})(window.AeroForge);
