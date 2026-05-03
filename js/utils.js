/**
 * AeroForge — Utility Functions
 * Shared helpers used across all modules.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatMoney(amount) {
        if (Math.abs(amount) >= 1000000) {
            return '$' + (amount / 1000000).toFixed(2) + 'M';
        } else if (Math.abs(amount) >= 1000) {
            return '$' + (amount / 1000).toFixed(0) + 'K';
        }
        return '$' + amount.toFixed(0);
    }

    function getCategoryName(cat) {
        var names = {
            wings: 'Kanatlar',
            fuselage: 'Gövde',
            engines: 'Motorlar',
            tail: 'Kuyruk',
            cockpit: 'Kokpit'
        };
        return names[cat] || cat;
    }

    function getStatName(stat) {
        var names = {
            lift: 'Kaldırma', drag: 'Sürükleme', weight: 'Ağırlık',
            speed: 'Hız', maneuver: 'Manevra', thrust: 'İtki',
            fuel: 'Yakıt', fuelEfficiency: 'Verimlilik', noise: 'Gürültü',
            strength: 'Dayanım', capacity: 'Kapasite', stability: 'Stabilite',
            control: 'Kontrol', stealth: 'Görünmezlik', safety: 'Güvenlik',
            navigation: 'Navigasyon', automation: 'Otomasyon', cost: 'Maliyet',
            range: 'Menzil'
        };
        return names[stat] || stat;
    }

    // Diminishing returns — soft cap with falloff above threshold
    function applyDiminishing(value, softCap, falloff) {
        if (value <= softCap) return value;
        var excess = value - softCap;
        return softCap + excess * falloff;
    }

    var STAT_SCALING = {
        speed:    { softCap: 600, falloff: 0.6 },
        range:    { softCap: 2500, falloff: 0.7 },
        capacity: null,
        safety:   null
    };

    // Expose utilities
    AF.escapeHtml = escapeHtml;
    AF.formatMoney = formatMoney;
    AF.getCategoryName = getCategoryName;
    AF.getStatName = getStatName;
    AF.applyDiminishing = applyDiminishing;
    AF.STAT_SCALING = STAT_SCALING;

})(window.AeroForge);
