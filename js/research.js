/**
 * AeroForge — Research System
 * Tech tree rendering, research start/progress/completion logic.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    function renderResearchFull() {
        var grid = document.getElementById('researchGrid');
        if (!grid) return;
        grid.innerHTML = '';

        var researchData = AF.researchData;
        var gameState = AF.gameState;

        for (var i = 0; i < researchData.length; i++) {
            var tech = researchData[i];
            if (!tech.unlocked) continue;

            var isActive = gameState.activeResearches.some(function(ar) { return ar.techId === tech.id; });
            var activeResearch = isActive ? gameState.activeResearches.find(function(ar) { return ar.techId === tech.id; }) : null;

            var card = document.createElement('div');
            card.className = 'research-card';
            card.innerHTML =
                '<div class="research-icon">' + tech.icon + '</div>' +
                '<div class="research-name">' + AF.escapeHtml(tech.name) + '</div>' +
                '<div class="research-desc">' + AF.escapeHtml(tech.desc) + '</div>' +
                '<div class="research-cost">' +
                    '<div class="cost-item"><div class="cost-label">Para</div><div class="cost-value">$' + (tech.cost.money / 1000).toFixed(0) + 'K</div></div>' +
                    '<div class="cost-item"><div class="cost-label">RP</div><div class="cost-value">' + tech.cost.rp + '</div></div>' +
                    '<div class="cost-item"><div class="cost-label">Süre</div><div class="cost-value">' + (tech.time / 1000).toFixed(1) + 's</div></div>' +
                '</div>' +
                '<button class="research-btn" id="btn-' + tech.id + '" data-action="start-research" data-tech-id="' + tech.id + '"' +
                    (tech.researched || isActive ? ' disabled' : '') + '>' +
                    (tech.researched ? '✓ Araştırıldı' : isActive ? '🔬 Araştırılıyor...' : '🔬 Araştırmaya Başla') +
                '</button>' +
                '<div class="research-progress' + (isActive ? ' active' : '') + '" id="progress-' + tech.id + '">' +
                    '<div class="progress-bar" style="width:' + (activeResearch ? activeResearch.progress : 0) + '%"></div>' +
                '</div>';
            grid.appendChild(card);
        }
    }

    function updateResearchProgressUI() {
        var researches = AF.gameState.activeResearches;
        for (var i = 0; i < researches.length; i++) {
            var ar = researches[i];
            var progressDiv = document.getElementById('progress-' + ar.techId);
            if (progressDiv) {
                var bar = progressDiv.querySelector('.progress-bar');
                if (bar) bar.style.width = ar.progress.toFixed(1) + '%';
            }
        }
    }

    function updateResearchProgress(dt) {
        var researches = AF.gameState.activeResearches;
        for (var i = researches.length - 1; i >= 0; i--) {
            var ar = researches[i];
            var increment = (dt / ar.duration) * 100;
            ar.progress = Math.min(100, ar.progress + increment);
            AF.dirty.researchProgress = true;

            if (ar.progress >= 100) {
                completeResearch(ar.techId);
                researches.splice(i, 1);
            }
        }
    }

    function startResearch(techId) {
        var researchData = AF.researchData;
        var gameState = AF.gameState;
        var tech = researchData.find(function(t) { return t.id === techId; });
        if (!tech || tech.researched) return;

        // Check if already researching
        if (gameState.activeResearches.some(function(ar) { return ar.techId === techId; })) return;

        if (gameState.budget < tech.cost.money || gameState.researchPoints < tech.cost.rp) {
            AF.showModal('Yetersiz Kaynak', 'Araştırma için yeterli bütçe veya araştırma puanınız yok!');
            return;
        }

        gameState.budget -= tech.cost.money;
        gameState.researchPoints -= tech.cost.rp;
        AF.dirty.stats = true;

        gameState.activeResearches.push({ techId: techId, duration: tech.time, progress: 0 });
        AF.dirty.researchFull = true;
    }

    function completeResearch(techId) {
        var researchData = AF.researchData;
        var gameState = AF.gameState;
        var tech = researchData.find(function(t) { return t.id === techId; });
        if (!tech) return;

        tech.researched = true;
        gameState.unlockedTechs.push(tech.id);
        gameState.prestige += 10;
        gameState.researchPoints += 25;

        // Unlock dependent techs
        for (var i = 0; i < researchData.length; i++) {
            var t = researchData[i];
            if (t.requires && t.requires.indexOf(tech.id) !== -1) {
                t.unlocked = true;
            }
        }

        AF.addNotification('✅ ' + tech.name + ' araştırması tamamlandı!');
        AF.dirty.researchFull = true;
        AF.dirty.designFull = true;
        AF.dirty.stats = true;
    }

    // Expose
    AF.renderResearchFull = renderResearchFull;
    AF.updateResearchProgressUI = updateResearchProgressUI;
    AF.updateResearchProgress = updateResearchProgress;
    AF.startResearch = startResearch;

})(window.AeroForge);
