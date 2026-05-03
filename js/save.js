/**
 * AeroForge — Save / Load System
 * localStorage persistence with versioning, component-ID serialization, and new-game reset.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    var SAVE_KEY = 'aeroforge_save';
    var SAVE_VERSION = 1;

    function saveGame(isAuto) {
        try {
            var gameState = AF.gameState;

            // Serialize current design by component IDs
            var designIds = {};
            var cats = Object.keys(gameState.currentDesign);
            for (var i = 0; i < cats.length; i++) {
                designIds[cats[i]] = gameState.currentDesign[cats[i]] ? gameState.currentDesign[cats[i]].id : null;
            }

            // Serialize production lines (aircraft by index)
            var prodSave = gameState.productionLines.map(function(line) {
                var acIdx = -1;
                if (line.aircraft) {
                    acIdx = gameState.completedAircrafts.indexOf(line.aircraft);
                    if (acIdx === -1) {
                        for (var j = 0; j < gameState.completedAircrafts.length; j++) {
                            if (gameState.completedAircrafts[j].id === line.aircraft.id) { acIdx = j; break; }
                        }
                    }
                }
                return {
                    id: line.id, name: line.name, status: line.status === 'working' ? 'idle' : line.status,
                    progress: 0, aircraftIndex: acIdx
                };
            });

            var saveData = {
                version: SAVE_VERSION,
                timestamp: Date.now(),
                state: {
                    companyName: gameState.companyName,
                    budget: gameState.budget,
                    prestige: gameState.prestige,
                    production: gameState.production,
                    researchPoints: gameState.researchPoints,
                    unlockedTechs: gameState.unlockedTechs.slice(),
                    designIds: designIds,
                    aircraftStats: Object.assign({}, gameState.aircraftStats),
                    testBonuses: Object.assign({}, gameState.testBonuses),
                    completedAircrafts: gameState.completedAircrafts.map(function(ac) {
                        var designCopy = {};
                        var dKeys = Object.keys(ac.design);
                        for (var d = 0; d < dKeys.length; d++) {
                            designCopy[dKeys[d]] = ac.design[dKeys[d]] ? ac.design[dKeys[d]].id : null;
                        }
                        return { name: ac.name, designIds: designCopy, stats: ac.stats, cost: ac.cost, id: ac.id };
                    }),
                    activeOrders: gameState.activeOrders.slice(),
                    achievements: gameState.achievements.slice(),
                    productionLines: prodSave
                },
                research: AF.researchData.map(function(t) { return { id: t.id, researched: t.researched, unlocked: t.unlocked }; }),
                market: AF.marketData.map(function(o) { return o.id; }),
                activeResearches: gameState.activeResearches.map(function(ar) {
                    return { techId: ar.techId, progress: ar.progress, duration: ar.duration };
                })
            };

            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            if (!isAuto) AF.addNotification('💾 Oyun kaydedildi.');
        } catch (e) {
            console.error('Kaydetme hatası:', e);
        }
    }

    function loadGame() {
        try {
            var raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;

            var saveData = JSON.parse(raw);
            if (!saveData || saveData.version !== SAVE_VERSION) return false;

            var s = saveData.state;

            // Reset data first
            AF.resetGameData();
            var gameState = AF.gameState;

            // Restore state
            gameState.companyName = s.companyName;
            gameState.budget = s.budget;
            gameState.prestige = s.prestige;
            gameState.production = s.production;
            gameState.researchPoints = s.researchPoints;
            gameState.unlockedTechs = s.unlockedTechs;
            gameState.testBonuses = s.testBonuses || { speed: 0, safety: 0 };
            gameState.activeOrders = s.activeOrders || [];
            gameState.achievements = s.achievements || [];

            // Restore research state
            if (saveData.research) {
                for (var i = 0; i < saveData.research.length; i++) {
                    var rs = saveData.research[i];
                    var tech = AF.researchData.find(function(t) { return t.id === rs.id; });
                    if (tech) {
                        tech.researched = rs.researched;
                        tech.unlocked = rs.unlocked;
                    }
                }
            }

            // Restore market
            if (saveData.market) {
                AF.marketData = AF.marketData.filter(function(o) { return saveData.market.indexOf(o.id) !== -1; });
            }

            // Helper to find a component by id across all categories
            function findComponentById(compId) {
                var allCats = Object.keys(AF.componentData);
                for (var ci = 0; ci < allCats.length; ci++) {
                    var comps = AF.componentData[allCats[ci]];
                    for (var cj = 0; cj < comps.length; cj++) {
                        if (comps[cj].id === compId) return comps[cj];
                    }
                }
                return null;
            }

            // Restore current design
            if (s.designIds) {
                var dCats = Object.keys(s.designIds);
                for (var d = 0; d < dCats.length; d++) {
                    if (s.designIds[dCats[d]]) {
                        gameState.currentDesign[dCats[d]] = findComponentById(s.designIds[dCats[d]]);
                    }
                }
            }

            // Restore completed aircrafts
            gameState.completedAircrafts = (s.completedAircrafts || []).map(function(ac) {
                var designObj = {};
                if (ac.designIds) {
                    var acCats = Object.keys(ac.designIds);
                    for (var ai = 0; ai < acCats.length; ai++) {
                        designObj[acCats[ai]] = ac.designIds[acCats[ai]] ? findComponentById(ac.designIds[acCats[ai]]) : null;
                    }
                }
                return { name: ac.name, design: designObj, stats: ac.stats, cost: ac.cost, id: ac.id };
            });

            // Restore production lines
            if (s.productionLines) {
                for (var p = 0; p < s.productionLines.length && p < gameState.productionLines.length; p++) {
                    var pl = s.productionLines[p];
                    gameState.productionLines[p].status = pl.status;
                    gameState.productionLines[p].progress = pl.progress;
                    if (pl.aircraftIndex >= 0 && pl.aircraftIndex < gameState.completedAircrafts.length) {
                        gameState.productionLines[p].aircraft = gameState.completedAircrafts[pl.aircraftIndex];
                    }
                }
            }

            // Restore active researches
            if (saveData.activeResearches) {
                gameState.activeResearches = saveData.activeResearches;
            }

            // Restore aircraft stats
            if (s.aircraftStats) {
                gameState.aircraftStats = s.aircraftStats;
            }

            return true;
        } catch (e) {
            console.error('Yükleme hatası:', e);
            return false;
        }
    }

    // Expose
    AF.saveGame = saveGame;
    AF.loadGame = loadGame;

})(window.AeroForge);
