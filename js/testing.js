/**
 * AeroForge — Testing & Flight Test System
 * Ground tests (wind tunnel, static, taxi) and full flight simulation.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    var FLIGHT_UPDATE_INTERVAL = 200;
    var FLIGHT_DURATION = 15000;

    // =============================================
    // GROUND TESTS
    // =============================================

    function renderTestingFull() {
        var grid = document.getElementById('testGrid');
        if (!grid) return;
        grid.innerHTML = '';

        var testData = AF.testData;
        var gameState = AF.gameState;

        for (var i = 0; i < testData.length; i++) {
            var test = testData[i];
            var disabled = false;
            var buttonText = '🧪 Testi Başlat';

            if (test.requiresDesign && gameState.completedAircrafts.length === 0) {
                disabled = true;
                buttonText = '⛔ Tasarım Gerekli';
            }

            var card = document.createElement('div');
            card.className = 'research-card';
            card.innerHTML =
                '<div class="research-icon">🧪</div>' +
                '<div class="research-name">' + AF.escapeHtml(test.name) + '</div>' +
                '<div class="research-desc">' + AF.escapeHtml(test.benefit) + '</div>' +
                '<div class="research-cost">' +
                    '<div class="cost-item"><div class="cost-label">Maliyet</div><div class="cost-value">$' + (test.cost / 1000).toFixed(0) + 'K</div></div>' +
                    '<div class="cost-item"><div class="cost-label">Süre</div><div class="cost-value">' + (test.duration / 1000).toFixed(0) + 's</div></div>' +
                '</div>' +
                '<button class="research-btn" data-action="start-test" data-test-id="' + test.id + '"' +
                    (disabled ? ' disabled' : '') + '>' + buttonText + '</button>';
            grid.appendChild(card);
        }
    }

    function startTest(testId) {
        var testData = AF.testData;
        var gameState = AF.gameState;
        var test = testData.find(function(t) { return t.id === testId; });
        if (!test) return;

        if (gameState.budget < test.cost) {
            AF.showModal('Yetersiz Bütçe', 'Test için yeterli bütçeniz yok!');
            return;
        }

        if (test.id === 'flight') {
            startFlightTest();
            return;
        }

        gameState.budget -= test.cost;
        AF.dirty.stats = true;

        AF.showModal('Test Devam Ediyor', AF.escapeHtml(test.name) + ' başlatıldı...');

        AF.TimerManager.setTimeout('test-' + testId, function() {
            AF.closeModal();

            var success = Math.random() > 0.2;
            var result = '';

            if (test.id === 'wind_tunnel') {
                result = success ?
                    '✅ Aerodinamik verimlilik optimal seviyede! Sürükleme katsayısı düşük.' :
                    '⚠️ Yüksek sürükleme tespit edildi. Kanat tasarımında iyileştirme önerilir.';
            } else if (test.id === 'static') {
                result = success ?
                    '✅ Yapısal bütünlük mükemmel! Tüm yük testlerini başarıyla geçti.' :
                    '❌ Yapısal zayıflık tespit edildi. Malzeme kalitesi artırılmalı.';
            } else if (test.id === 'taxi') {
                result = success ?
                    '✅ Yer performansı mükemmel! Dönüş ve frenleme testleri başarılı.' :
                    '⚠️ Frenleme mesafesi uzun. Hidrolik sistem güçlendirilmeli.';
            }

            // BUG-08 FIX: Apply bonuses to persistent testBonuses
            if (success && test.bonusType) {
                gameState.testBonuses[test.bonusType] = (gameState.testBonuses[test.bonusType] || 0) + test.bonusAmount;
                AF.calculateAircraftStats();
            }

            if (success) {
                gameState.prestige += 10;
                gameState.researchPoints += 15;
            }

            AF.showModal('Test Sonuçları', result);
            AF.dirty.stats = true;
        }, test.duration);
    }

    // =============================================
    // FLIGHT TEST SYSTEM
    // =============================================

    function startFlightTest() {
        var gameState = AF.gameState;

        if (gameState.completedAircrafts.length === 0) {
            AF.showModal('Hata', 'Test edilecek uçak tasarımı yok!');
            return;
        }

        gameState.budget -= 200000;
        AF.dirty.stats = true;

        var ft = gameState.flightTest;
        ft.active = true;
        ft.altitude = 10000;
        ft.speed = 450;
        ft.thrust = 85;
        ft.fuel = 100;
        ft.integrity = 100;
        ft.startTime = performance.now();
        ft.lastUpdate = ft.startTime;

        document.getElementById('flightTest').classList.add('active');

        // Generate clouds
        var sky = document.getElementById('sky');
        var existingClouds = sky.querySelectorAll('.cloud');
        for (var c = 0; c < existingClouds.length; c++) existingClouds[c].remove();

        for (var i = 0; i < 5; i++) {
            var cloud = document.createElement('div');
            cloud.className = 'cloud';
            cloud.style.width = (100 + Math.random() * 100) + 'px';
            cloud.style.height = (40 + Math.random() * 40) + 'px';
            cloud.style.top = (Math.random() * 60) + '%';
            cloud.style.left = (Math.random() * 100 + 100) + '%';
            cloud.style.animation = 'cloudFloat ' + (10 + Math.random() * 10) + 's linear infinite';
            sky.appendChild(cloud);
        }

        // Reset test aircraft animation
        var testAircraft = document.getElementById('testAircraft');
        if (testAircraft) {
            testAircraft.style.animation = 'none';
            void testAircraft.offsetHeight; // force reflow
            testAircraft.style.animation = 'fly 10s linear forwards';
        }
    }

    function updateFlightTick(timestamp) {
        var gameState = AF.gameState;
        var ft = gameState.flightTest;
        if (!ft.active) return;

        var elapsed = timestamp - ft.startTime;

        ft.altitude += Math.random() * 500 - 100;
        ft.speed += Math.random() * 20 - 10;
        ft.thrust = Math.max(60, Math.min(100, ft.thrust + Math.random() * 4 - 2));
        ft.fuel -= 0.5;

        // Safety-based structural degradation
        if (gameState.aircraftStats.safety < 50 && Math.random() > 0.95) {
            ft.integrity -= 5;
        }

        AF.dirty.flightData = true;

        // Check end conditions — BUG-01 & BUG-02 FIX: Single unified exit path
        if (ft.fuel <= 0 || ft.integrity <= 0 || elapsed >= FLIGHT_DURATION) {
            var success = ft.integrity > 0;
            ft.active = false;

            AF.TimerManager.setTimeout('flight-result', function() {
                closeFlightTest();
                if (success) {
                    AF.showModal('✅ Test Başarılı', 'İlk uçuş mükemmel! Uçak sertifikasyonu alındı.');
                    gameState.prestige += 50;
                    gameState.researchPoints += 100;
                    AF.dirty.stats = true;
                } else {
                    AF.showModal('❌ Test Başarısız', 'Yapısal arıza! Tasarım gözden geçirilmeli.');
                }
            }, 1000);
        }
    }

    function renderFlightData() {
        var ft = AF.gameState.flightTest;
        var altEl = document.getElementById('flight-altitude');
        var speedEl = document.getElementById('flight-speed');
        var thrustEl = document.getElementById('flight-thrust');
        var fuelEl = document.getElementById('flight-fuel');
        var intEl = document.getElementById('flight-integrity');

        if (altEl) altEl.textContent = Math.round(ft.altitude).toLocaleString() + ' ft';
        if (speedEl) speedEl.textContent = Math.round(ft.speed) + ' km/s';
        if (thrustEl) thrustEl.textContent = Math.round(ft.thrust) + '%';
        if (fuelEl) fuelEl.textContent = Math.max(0, ft.fuel).toFixed(1) + '%';
        if (intEl) intEl.textContent = Math.max(0, ft.integrity) + '%';
    }

    function closeFlightTest() {
        AF.gameState.flightTest.active = false;
        document.getElementById('flightTest').classList.remove('active');

        // Clean up clouds
        var sky = document.getElementById('sky');
        var clouds = sky.querySelectorAll('.cloud');
        for (var i = 0; i < clouds.length; i++) clouds[i].remove();
    }

    // Expose
    AF.FLIGHT_UPDATE_INTERVAL = FLIGHT_UPDATE_INTERVAL;
    AF.FLIGHT_DURATION = FLIGHT_DURATION;
    AF.renderTestingFull = renderTestingFull;
    AF.startTest = startTest;
    AF.updateFlightTick = updateFlightTick;
    AF.renderFlightData = renderFlightData;
    AF.closeFlightTest = closeFlightTest;

})(window.AeroForge);
