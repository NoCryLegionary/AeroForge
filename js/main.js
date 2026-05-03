/**
 * AeroForge — Main Entry Point
 * Event delegation, keyboard shortcuts, game initialization, and boot sequence.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    // =============================================
    // GAME INITIALIZATION
    // =============================================

    function startGame() {
        var nameInput = document.getElementById('companyNameInput').value.trim();
        if (nameInput) {
            AF.gameState.companyName = nameInput;
        }
        document.getElementById('companyDisplay').textContent = AF.escapeHtml(AF.gameState.companyName).toUpperCase();

        document.getElementById('startOverlay').classList.add('hidden');

        try {
            initGameUI();
            AF.startGameLoop();

            AF.addNotification('🎉 ' + AF.escapeHtml(AF.gameState.companyName) + ' şirketiniz kuruldu!');
            AF.addNotification('💡 İlk göreviniz: Temel kanat tasarımını araştırın.');
        } catch (error) {
            console.error('Oyun başlatma hatası:', error);
        }
    }

    function initGameUI() {
        AF.markAllDirty();
        AF.renderDirty();
        AF.updateSVGPreview();
        AF.calculateAircraftStats();
        AF.renderDesignStats();
    }

    function newGame() {
        if (!confirm('Yeni oyun başlatılsın mı? Mevcut ilerlemeniz silinecek.')) return;
        localStorage.removeItem('aeroforge_save');
        AF.stopGameLoop();
        AF.TimerManager.clearAll();
        AF.resetGameData();
        initGameUI();
        AF.startGameLoop();
        AF.addNotification('🔄 Yeni oyun başlatıldı!');
    }

    // =============================================
    // EVENT DELEGATION (SEC-03 FIX)
    // =============================================

    document.addEventListener('click', function(e) {
        var actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;

        var action = actionEl.getAttribute('data-action');

        switch (action) {
            case 'start-game':
                startGame();
                break;
            case 'show-section':
                AF.showSection(actionEl.getAttribute('data-section'), actionEl);
                break;
            case 'start-research':
                AF.startResearch(actionEl.getAttribute('data-tech-id'));
                break;
            case 'select-component':
                AF.selectComponent(actionEl.getAttribute('data-category'), actionEl.getAttribute('data-comp-id'));
                break;
            case 'save-design':
                AF.saveDesign();
                break;
            case 'confirm-design-name':
                AF.confirmDesignName(parseFloat(actionEl.getAttribute('data-cost')));
                break;
            case 'select-production':
                AF.selectAircraftForProduction(parseInt(actionEl.getAttribute('data-line')));
                break;
            case 'toggle-production':
                AF.toggleProduction(parseInt(actionEl.getAttribute('data-line')));
                break;
            case 'assign-to-line':
                AF.assignToLine(parseInt(actionEl.getAttribute('data-line')), parseInt(actionEl.getAttribute('data-aircraft')));
                AF.closeModal();
                break;
            case 'start-test':
                AF.startTest(actionEl.getAttribute('data-test-id'));
                break;
            case 'accept-order':
                AF.acceptOrder(actionEl.getAttribute('data-order-id'));
                break;
            case 'close-modal':
                AF.closeModal();
                break;
            case 'close-flight-test':
                AF.closeFlightTest();
                break;
            case 'save-game':
                AF.saveGame(false);
                break;
            case 'new-game':
                newGame();
                break;
        }
    });

    // Modal click-outside-to-close
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target.id === 'modal') AF.closeModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            AF.closeModal();
            if (AF.gameState.flightTest.active) AF.closeFlightTest();
        }
    });

    // SVG part click → scroll to category
    document.getElementById('aircraftSvg').addEventListener('click', function(e) {
        var part = e.target.closest('.aircraft-part');
        if (!part) return;
        var category = part.getAttribute('data-part');
        var items = document.querySelectorAll('.component-item[data-category="' + category + '"]');
        if (items.length > 0) {
            items[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            items[0].style.animation = 'pulse 1s';
            setTimeout(function() { items[0].style.animation = ''; }, 1000);
        }
    });

    // =============================================
    // BOOT SEQUENCE
    // =============================================

    window.addEventListener('DOMContentLoaded', function() {
        var input = document.getElementById('companyNameInput');
        if (input) input.focus();

        // Try to load existing save
        var loaded = AF.loadGame();
        if (loaded) {
            document.getElementById('startOverlay').classList.add('hidden');
            document.getElementById('companyDisplay').textContent = AF.escapeHtml(AF.gameState.companyName).toUpperCase();
            initGameUI();
            AF.startGameLoop();
            AF.addNotification('💾 Kayıtlı oyun yüklendi.');
        }
    });

})(window.AeroForge);
