/**
 * AeroForge — UI Helpers
 * Modal, notifications, header stats, section switching.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    function showModal(title, content) {
        var modal = document.getElementById('modal');
        var modalTitle = document.getElementById('modalTitle');
        var modalBody = document.getElementById('modalBody');

        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = content;
        if (modal) modal.classList.add('active');
    }

    function closeModal() {
        var modal = document.getElementById('modal');
        if (modal) modal.classList.remove('active');
    }

    function addNotification(message) {
        var list = document.getElementById('notificationList');
        if (!list) return;

        var item = document.createElement('div');
        item.className = 'notification-item';
        var time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        item.innerHTML = message + '<div class="notification-time">' + time + '</div>';

        list.insertBefore(item, list.firstChild);

        // Cap at 20 notifications (memory management)
        while (list.children.length > 20) {
            list.removeChild(list.lastChild);
        }
    }

    function updateStatsUI() {
        var gs = AF.gameState;
        var budgetEl = document.getElementById('budget');
        var prestigeEl = document.getElementById('prestige');
        var productionEl = document.getElementById('production');
        var rpEl = document.getElementById('researchPoints');

        if (budgetEl) budgetEl.textContent = AF.formatMoney(gs.budget);
        if (prestigeEl) prestigeEl.textContent = gs.prestige;
        if (productionEl) productionEl.textContent = gs.production;
        if (rpEl) rpEl.textContent = gs.researchPoints;
    }

    function showSection(sectionName, btnElement) {
        var sections = document.querySelectorAll('.section');
        for (var i = 0; i < sections.length; i++) sections[i].style.display = 'none';

        var section = document.getElementById(sectionName + '-section');
        if (section) section.style.display = 'block';

        var navBtns = document.querySelectorAll('.nav-btn[data-action="show-section"]');
        for (var j = 0; j < navBtns.length; j++) navBtns[j].classList.remove('active');
        if (btnElement) btnElement.classList.add('active');

        // Trigger renders for the visible section
        var dirty = AF.dirty;
        if (sectionName === 'market') dirty.marketFull = true;
        if (sectionName === 'testing') dirty.testingFull = true;
        if (sectionName === 'production') dirty.productionFull = true;
        if (sectionName === 'research') dirty.researchFull = true;
        if (sectionName === 'design') { dirty.designFull = true; dirty.designStats = true; }
    }

    // Expose
    AF.showModal = showModal;
    AF.closeModal = closeModal;
    AF.addNotification = addNotification;
    AF.updateStatsUI = updateStatsUI;
    AF.showSection = showSection;

})(window.AeroForge);
