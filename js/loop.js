/**
 * AeroForge — Game Loop & Dirty Render Pass
 * Centralized requestAnimationFrame heartbeat managing all subsystems.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    // Timing constants
    var PASSIVE_INCOME_INTERVAL = 10000;
    var ACHIEVEMENT_CHECK_INTERVAL = 5000;
    var AUTO_SAVE_INTERVAL = 60000;
    var GAME_TICK = 100;

    var gameLoopId = null;
    var lastTimestamp = 0;
    var lastGameTick = 0;
    var lastPassiveTick = 0;
    var lastAchievementTick = 0;
    var lastAutoSave = 0;
    var gameRunning = false;

    function gameLoop(timestamp) {
        if (!gameRunning) return;

        var dt = timestamp - lastTimestamp;
        if (dt > 1000) dt = GAME_TICK; // clamp after tab switch
        lastTimestamp = timestamp;

        var gameState = AF.gameState;

        // Flight test — high frequency updates
        if (gameState.flightTest.active) {
            if (timestamp - gameState.flightTest.lastUpdate >= AF.FLIGHT_UPDATE_INTERVAL) {
                gameState.flightTest.lastUpdate = timestamp;
                AF.updateFlightTick(timestamp);
            }
        }

        // Game tick — research & production progress
        if (timestamp - lastGameTick >= GAME_TICK) {
            lastGameTick = timestamp;
            AF.updateResearchProgress(dt);
            AF.updateProductionProgress(dt);
        }

        // Passive income — every 10s
        if (timestamp - lastPassiveTick >= PASSIVE_INCOME_INTERVAL) {
            lastPassiveTick = timestamp;
            AF.processPassiveIncome();
            AF.processMarketFluctuation();
        }

        // Achievement check — every 5s
        if (timestamp - lastAchievementTick >= ACHIEVEMENT_CHECK_INTERVAL) {
            lastAchievementTick = timestamp;
            AF.checkAchievements();
        }

        // Auto-save — every 60s
        if (timestamp - lastAutoSave >= AUTO_SAVE_INTERVAL) {
            lastAutoSave = timestamp;
            AF.saveGame(true);
        }

        // Render dirty sections
        renderDirty();

        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function startGameLoop() {
        if (gameRunning) return;
        gameRunning = true;
        lastTimestamp = performance.now();
        lastGameTick = lastTimestamp;
        lastPassiveTick = lastTimestamp;
        lastAchievementTick = lastTimestamp;
        lastAutoSave = lastTimestamp;
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function stopGameLoop() {
        gameRunning = false;
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
    }

    // =============================================
    // DIRTY RENDER PASS
    // =============================================

    function renderDirty() {
        var dirty = AF.dirty;
        if (dirty.stats) { AF.updateStatsUI(); dirty.stats = false; }
        if (dirty.researchFull) { AF.renderResearchFull(); dirty.researchFull = false; dirty.researchProgress = false; }
        if (dirty.researchProgress) { AF.updateResearchProgressUI(); dirty.researchProgress = false; }
        if (dirty.designFull) { AF.renderDesignFull(); dirty.designFull = false; }
        if (dirty.designStats) { AF.renderDesignStats(); dirty.designStats = false; }
        if (dirty.productionFull) { AF.renderProductionFull(); dirty.productionFull = false; dirty.productionProgress = false; }
        if (dirty.productionProgress) { AF.updateProductionProgressUI(); dirty.productionProgress = false; }
        if (dirty.testingFull) { AF.renderTestingFull(); dirty.testingFull = false; }
        if (dirty.marketFull) { AF.renderMarketFull(); dirty.marketFull = false; }
        if (dirty.flightData) { AF.renderFlightData(); dirty.flightData = false; }
        if (dirty.activeOrders) { AF.renderActiveOrders(); dirty.activeOrders = false; }
    }

    // Expose
    AF.startGameLoop = startGameLoop;
    AF.stopGameLoop = stopGameLoop;
    AF.renderDirty = renderDirty;

})(window.AeroForge);
