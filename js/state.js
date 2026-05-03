/**
 * AeroForge — Game State & Dirty Flags
 * Central mutable state, factory function, dirty-flag system for incremental rendering.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    // =============================================
    // MUTABLE RUNTIME DATA (cloned from templates)
    // =============================================

    AF.researchData = null;
    AF.componentData = null;
    AF.testData = null;
    AF.marketData = null;
    AF.gameState = null;

    function createFreshState() {
        return {
            companyName: 'AeroForge',
            budget: 5000000,
            prestige: 0,
            production: 0,
            researchPoints: 100,
            unlockedTechs: [],
            currentDesign: { wings: null, fuselage: null, engines: null, tail: null, cockpit: null },
            aircraftStats: { speed: 0, range: 0, capacity: 0, safety: 0 },
            testBonuses: { speed: 0, safety: 0 },
            productionLines: [
                { id: 1, name: 'Montaj Hattı A', status: 'idle', progress: 0, aircraft: null },
                { id: 2, name: 'Montaj Hattı B', status: 'offline', progress: 0, aircraft: null }
            ],
            completedAircrafts: [],
            activeOrders: [],
            activeResearches: [],
            achievements: [],
            flightTest: { active: false, altitude: 0, speed: 0, thrust: 0, fuel: 0, integrity: 0, lastUpdate: 0, startTime: 0 }
        };
    }

    function resetGameData() {
        AF.researchData = JSON.parse(JSON.stringify(AF.RESEARCH_TEMPLATE));
        AF.componentData = JSON.parse(JSON.stringify(AF.COMPONENT_TEMPLATE));
        AF.testData = JSON.parse(JSON.stringify(AF.TEST_TEMPLATE));
        AF.marketData = JSON.parse(JSON.stringify(AF.MARKET_TEMPLATE));
        AF.gameState = createFreshState();
    }

    // =============================================
    // DIRTY FLAGS
    // =============================================

    var dirty = {
        stats: false,
        researchFull: false,
        researchProgress: false,
        designFull: false,
        designStats: false,
        designSvg: false,
        productionFull: false,
        productionProgress: false,
        testingFull: false,
        marketFull: false,
        flightData: false,
        activeOrders: false
    };

    function markAllDirty() {
        var keys = Object.keys(dirty);
        for (var i = 0; i < keys.length; i++) dirty[keys[i]] = true;
    }

    // Expose
    AF.createFreshState = createFreshState;
    AF.resetGameData = resetGameData;
    AF.dirty = dirty;
    AF.markAllDirty = markAllDirty;

    // Initialize with fresh data on first load
    resetGameData();

})(window.AeroForge);
