/**
 * AeroForge — Design System
 * Component selection, SVG morphing preview, aircraft stat calculation, design saving.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    // =============================================
    // COMPONENT SELECTION & RENDERING
    // =============================================

    function renderDesignFull() {
        var list = document.getElementById('componentList');
        if (!list) return;
        list.innerHTML = '';

        var componentData = AF.componentData;
        var gameState = AF.gameState;

        var categories = Object.keys(componentData);
        for (var c = 0; c < categories.length; c++) {
            var category = categories[c];
            var components = componentData[category].filter(function(comp) {
                return !comp.tech || gameState.unlockedTechs.indexOf(comp.tech) !== -1;
            });
            if (components.length === 0) continue;

            var catDiv = document.createElement('div');
            catDiv.innerHTML = '<h4 style="color:var(--secondary);margin:15px 0 10px;text-transform:uppercase;font-size:0.9rem;letter-spacing:2px;">' +
                AF.getCategoryName(category) + '</h4>';
            list.appendChild(catDiv);

            for (var j = 0; j < components.length; j++) {
                var comp = components[j];
                var isSelected = gameState.currentDesign[category] && gameState.currentDesign[category].id === comp.id;

                var statsHtml = '';
                var statKeys = Object.keys(comp.stats);
                for (var s = 0; s < statKeys.length; s++) {
                    var stat = statKeys[s];
                    var value = comp.stats[stat];
                    var percent = Math.min(100, Math.max(0, value));
                    var colorClass = percent > 60 ? 'high' : percent > 30 ? 'medium' : 'low';
                    statsHtml +=
                        '<div class="component-stat">' +
                            '<span>' + AF.getStatName(stat) + '</span>' +
                            '<div class="stat-bar"><div class="stat-fill ' + colorClass + '" style="width:' + percent + '%"></div></div>' +
                        '</div>';
                }

                var item = document.createElement('div');
                item.className = 'component-item' + (isSelected ? ' selected' : '');
                item.setAttribute('data-action', 'select-component');
                item.setAttribute('data-comp-id', comp.id);
                item.setAttribute('data-category', category);
                item.innerHTML =
                    '<div class="component-info">' +
                        '<h4>' + AF.escapeHtml(comp.name) + '</h4>' +
                        '<div class="component-stats">' + statsHtml + '</div>' +
                    '</div>' +
                    '<div style="text-align:right;">' +
                        '<div style="color:var(--warning);font-weight:700;">$' + (comp.cost / 1000).toFixed(0) + 'K</div>' +
                        '<div style="font-size:0.8rem;color:rgba(255,255,255,0.5);">Seç</div>' +
                    '</div>';
                list.appendChild(item);
            }
        }
    }

    function selectComponent(category, compId) {
        var componentData = AF.componentData;
        var gameState = AF.gameState;
        var comp = null;
        var components = componentData[category];
        for (var i = 0; i < components.length; i++) {
            if (components[i].id === compId) { comp = components[i]; break; }
        }
        if (!comp) return;

        gameState.currentDesign[category] = comp;

        // BUG-03 FIX: Only deselect within same category
        var items = document.querySelectorAll('.component-item');
        for (var j = 0; j < items.length; j++) {
            if (items[j].getAttribute('data-category') === category) {
                items[j].classList.remove('selected');
                if (items[j].getAttribute('data-comp-id') === compId) {
                    items[j].classList.add('selected');
                }
            }
        }

        // Highlight SVG part
        var parts = document.querySelectorAll('.aircraft-part');
        for (var k = 0; k < parts.length; k++) {
            parts[k].classList.remove('selected');
            if (parts[k].getAttribute('data-part') === category) {
                parts[k].classList.add('selected');
            }
        }

        calculateAircraftStats();
        updateSVGPreview();
        AF.addNotification('✏️ ' + comp.name + ' seçildi');
    }

    // =============================================
    // SVG PREVIEW CONTROLLER
    // =============================================

    function updateSVGPreview() {
        var design = AF.gameState.currentDesign;
        var SVG = AF.SVG_PATHS;

        // Wings morphing
        if (design.wings) {
            var wingsEl = document.getElementById('svg-wings');
            var wPath = SVG.wings[design.wings.id] || SVG.wings.default;
            if (wingsEl) wingsEl.setAttribute('d', wPath);
        }

        // Fuselage morphing
        if (design.fuselage) {
            var fusEl = document.getElementById('svg-fuselage');
            var fData = SVG.fuselage[design.fuselage.id] || SVG.fuselage.default;
            if (fusEl) {
                fusEl.setAttribute('rx', fData.rx);
                fusEl.setAttribute('ry', fData.ry);
            }
            // Material-based gradient
            var usesComposite = AF.gameState.unlockedTechs.indexOf('material_composite') !== -1;
            if (fusEl) fusEl.setAttribute('fill', usesComposite ? 'url(#compositeGradient)' : 'url(#fuselageGradient)');
        }

        // Tail morphing
        if (design.tail) {
            var tailEl = document.getElementById('svg-tail');
            var tPath = SVG.tail[design.tail.id] || SVG.tail.default;
            if (tailEl) tailEl.setAttribute('d', tPath);
        }

        // Engines morphing
        if (design.engines) {
            var engGroup = document.getElementById('svg-engines');
            var eData = SVG.engines[design.engines.id] || SVG.engines.default;
            if (engGroup) {
                engGroup.innerHTML = '';
                for (var i = 0; i < eData.length; i++) {
                    var r = eData[i];
                    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', r.x);
                    rect.setAttribute('y', r.y);
                    rect.setAttribute('width', r.w);
                    rect.setAttribute('height', r.h);
                    rect.setAttribute('rx', '5');
                    rect.setAttribute('fill', '#333');
                    rect.setAttribute('stroke', '#00d4ff');
                    rect.setAttribute('stroke-width', '2');
                    engGroup.appendChild(rect);
                }
            }
        }

        // Cockpit morphing
        if (design.cockpit) {
            var cpEl = document.getElementById('svg-cockpit');
            var cPath = SVG.cockpit[design.cockpit.id] || SVG.cockpit.default;
            if (cpEl) {
                cpEl.setAttribute('d', cPath);
                var isAdvanced = design.cockpit.id === 'c_advanced';
                var isGlass = design.cockpit.id === 'c_glass';
                cpEl.setAttribute('fill', isAdvanced ? '#0a2a4a' : isGlass ? '#0d1b2a' : '#1a1a2e');
                cpEl.setAttribute('stroke', isAdvanced ? '#00ff88' : '#00d4ff');
            }
        }
    }

    // =============================================
    // AIRCRAFT STAT CALCULATOR (with diminishing returns)
    // =============================================

    function calculateAircraftStats() {
        var design = AF.gameState.currentDesign;
        var gameState = AF.gameState;
        var rawSpeed = 300, rawRange = 500, capacity = 0, rawSafety = 50;

        if (design.wings) {
            rawSpeed += (design.wings.stats.speed || 0) * 5;
            rawSafety += (design.wings.stats.lift || 0) * 0.2;
        }
        if (design.fuselage) {
            capacity = design.fuselage.stats.capacity * 10;
            rawSafety += (design.fuselage.stats.weight || 0) * 0.1;
        }
        if (design.engines) {
            rawSpeed += (design.engines.stats.thrust || 0) * 8;
            rawRange += (design.engines.stats.fuel || 0) * 50; // BUG-04 FIX: additive
        }
        if (design.tail) {
            rawSafety += (design.tail.stats.stability || 0) * 0.5;
        }
        if (design.cockpit) {
            rawSafety += (design.cockpit.stats.safety || 0) * 0.8;
        }

        // BUG-08 FIX: Apply persistent test bonuses
        rawSpeed += gameState.testBonuses.speed;
        rawSafety += gameState.testBonuses.safety;

        // Apply diminishing returns
        var SS = AF.STAT_SCALING;
        var finalSpeed = SS.speed ? AF.applyDiminishing(rawSpeed, SS.speed.softCap, SS.speed.falloff) : rawSpeed;
        var finalRange = SS.range ? AF.applyDiminishing(rawRange, SS.range.softCap, SS.range.falloff) : rawRange;

        gameState.aircraftStats = {
            speed: Math.round(finalSpeed),
            range: Math.round(finalRange),
            capacity: Math.round(capacity),
            safety: Math.min(100, Math.round(rawSafety))
        };

        AF.dirty.designStats = true;
    }

    function renderDesignStats() {
        var stats = AF.gameState.aircraftStats;
        var speedEl = document.getElementById('stat-speed');
        var rangeEl = document.getElementById('stat-range');
        var capacityEl = document.getElementById('stat-capacity');
        var safetyEl = document.getElementById('stat-safety');

        if (speedEl) speedEl.textContent = stats.speed + ' km/s';
        if (rangeEl) rangeEl.textContent = stats.range + ' km';
        if (capacityEl) capacityEl.textContent = stats.capacity + ' kg';
        if (safetyEl) {
            safetyEl.textContent = stats.safety + '%';
            safetyEl.className = 'aircraft-stat-value ' + (stats.safety > 70 ? 'success' : stats.safety > 40 ? 'warning' : 'danger');
        }
    }

    // =============================================
    // SAVE DESIGN
    // =============================================

    function saveDesign() {
        var design = AF.gameState.currentDesign;
        var gameState = AF.gameState;

        if (!design.wings || !design.fuselage || !design.engines) {
            AF.showModal('Eksik Bileşen', 'Uçak tasarımı için en az kanat, gövde ve motor seçmelisiniz!');
            return;
        }

        var totalCost = 0;
        var keys = Object.keys(design);
        for (var i = 0; i < keys.length; i++) {
            if (design[keys[i]]) totalCost += design[keys[i]].cost;
        }

        if (gameState.budget < totalCost) {
            AF.showModal('Yetersiz Bütçe', 'Tasarım maliyeti: ' + AF.formatMoney(totalCost));
            return;
        }

        // Show naming modal instead of browser prompt
        AF.showModal('✈️ Tasarımı Kaydet',
            '<div style="text-align:center;padding:10px 0;">' +
                '<p style="color:rgba(255,255,255,0.7);margin-bottom:20px;">Uçağınıza bir isim verin</p>' +
                '<p style="font-size:0.9rem;color:var(--warning);margin-bottom:20px;">Tasarım maliyeti: ' + AF.formatMoney(totalCost) + '</p>' +
                '<input type="text" id="designNameInput" value="AF-1X Prototype" maxlength="30" ' +
                    'style="width:100%;padding:12px 20px;font-size:1.1rem;background:rgba(0,212,255,0.1);border:2px solid var(--primary);' +
                    'border-radius:10px;color:#fff;text-align:center;font-family:Orbitron,sans-serif;margin-bottom:20px;outline:none;" />' +
                '<button class="research-btn" data-action="confirm-design-name" data-cost="' + totalCost + '" ' +
                    'style="margin-top:5px;">💾 Tasarımı Onayla</button>' +
            '</div>'
        );

        // Auto-focus the input after modal renders
        setTimeout(function() {
            var inp = document.getElementById('designNameInput');
            if (inp) { inp.focus(); inp.select(); }
        }, 100);
    }

    function confirmDesignName(totalCost) {
        var input = document.getElementById('designNameInput');
        var aircraftName = input ? input.value.trim() : '';
        if (!aircraftName) aircraftName = 'AF-1X Prototype';

        var design = AF.gameState.currentDesign;
        var gameState = AF.gameState;

        gameState.budget -= totalCost;

        // BUG-05 FIX: Deep clone the design
        var newAircraft = {
            name: aircraftName,
            design: structuredClone(design),
            stats: { speed: gameState.aircraftStats.speed, range: gameState.aircraftStats.range, capacity: gameState.aircraftStats.capacity, safety: gameState.aircraftStats.safety },
            cost: totalCost,
            id: Date.now()
        };

        gameState.completedAircrafts.push(newAircraft);
        AF.addNotification('💾 "' + AF.escapeHtml(aircraftName) + '" tasarımı kaydedildi!');
        AF.dirty.stats = true;
        AF.dirty.testingFull = true;
        AF.dirty.marketFull = true;
        AF.closeModal();
    }

    // Expose
    AF.renderDesignFull = renderDesignFull;
    AF.selectComponent = selectComponent;
    AF.updateSVGPreview = updateSVGPreview;
    AF.calculateAircraftStats = calculateAircraftStats;
    AF.renderDesignStats = renderDesignStats;
    AF.saveDesign = saveDesign;
    AF.confirmDesignName = confirmDesignName;

})(window.AeroForge);
