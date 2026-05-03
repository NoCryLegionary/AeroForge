/**
 * AeroForge — Master Data Templates
 * All frozen template objects: research, components, tests, market orders, SVG paths.
 * These are cloned at runtime to create mutable game data.
 */
'use strict';

window.AeroForge = window.AeroForge || {};

(function(AF) {

    var RESEARCH_TEMPLATE = Object.freeze([
        {
            id: 'wing_basic', name: 'Temel Kanat Tasarımı', category: 'Aerodinamik', icon: '🪽',
            desc: 'Klasik düz kanat tasarımı. Düşük hızda stabil uçuş sağlar. Başlangıç seviyesi için ideal.',
            cost: { money: 50000, rp: 20 }, time: 5000, unlocked: true, researched: false,
            effects: { lift: 10, drag: 5 }
        },
        {
            id: 'wing_swept', name: 'Açılı Kanat (Swept)', category: 'Aerodinamik', icon: '✈️',
            desc: 'Ses hızına yakın hızlarda sürtünmeyi azaltan açılı kanat teknolojisi.',
            cost: { money: 150000, rp: 50 }, time: 8000, unlocked: true, researched: false,
            effects: { lift: 15, drag: -10, speed: 20 }, requires: ['wing_basic']
        },
        {
            id: 'wing_delta', name: 'Delta Kanat', category: 'Aerodinamik', icon: '🔺',
            desc: 'Supersonik uçuş için optimize edilmiş delta kanat yapısı. Yüksek manevra kabiliyeti.',
            cost: { money: 300000, rp: 80 }, time: 12000, unlocked: false, researched: false,
            effects: { lift: 20, drag: -15, speed: 35, maneuver: 25 }, requires: ['wing_swept']
        },
        {
            id: 'engine_turbofan', name: 'Turbofan Motor', category: 'İtki Sistemleri', icon: '⚙️',
            desc: 'Yüksek verimli turbofan motor. Ticari uçaklar için standart.',
            cost: { money: 200000, rp: 40 }, time: 7000, unlocked: true, researched: false,
            effects: { thrust: 25, fuelEfficiency: 15, noise: -10 }
        },
        {
            id: 'engine_turbojet', name: 'Turbojet Motor', category: 'İtki Sistemleri', icon: '🔥',
            desc: 'Yüksek hızlı turbojet motor. Askeri uçaklar için uygundur.',
            cost: { money: 400000, rp: 90 }, time: 10000, unlocked: false, researched: false,
            effects: { thrust: 45, fuelEfficiency: -5, speed: 30 }, requires: ['engine_turbofan']
        },
        {
            id: 'material_aluminum', name: 'Alüminyum Alaşımları', category: 'Malzemeler', icon: '🔩',
            desc: 'Hafif ve dayanıklı alüminyum alaşımları. Havacılıkta yaygın kullanım.',
            cost: { money: 100000, rp: 30 }, time: 6000, unlocked: true, researched: false,
            effects: { weight: -10, strength: 15, cost: -5 }
        },
        {
            id: 'material_composite', name: 'Kompozit Malzemeler', category: 'Malzemeler', icon: '🧬',
            desc: 'Karbon fiber kompozitler. Ultra hafif ve son derece dayanıklı.',
            cost: { money: 500000, rp: 120 }, time: 15000, unlocked: false, researched: false,
            effects: { weight: -25, strength: 30, cost: 20 }, requires: ['material_aluminum']
        },
        {
            id: 'avionics_basic', name: 'Temel Aviyonik', category: 'Elektronik', icon: '📡',
            desc: 'Temel uçuş bilgisayarı ve navigasyon sistemleri.',
            cost: { money: 150000, rp: 35 }, time: 6000, unlocked: true, researched: false,
            effects: { safety: 15, navigation: 10 }
        },
        {
            id: 'avionics_advanced', name: 'Gelişmiş Aviyonik', category: 'Elektronik', icon: '🛰️',
            desc: 'Fly-by-wire sistemi ve gelişmiş otopilot.',
            cost: { money: 600000, rp: 150 }, time: 18000, unlocked: false, researched: false,
            effects: { safety: 35, navigation: 30, maneuver: 15 }, requires: ['avionics_basic']
        }
    ]);

    var COMPONENT_TEMPLATE = Object.freeze({
        wings: [
            { id: 'w_basic', name: 'Standart Kanat', tech: 'wing_basic', stats: { lift: 50, drag: 30, weight: 40 }, cost: 50000 },
            { id: 'w_swept', name: 'Açılı Kanat', tech: 'wing_swept', stats: { lift: 65, drag: 20, weight: 45, speed: 20 }, cost: 120000 },
            { id: 'w_delta', name: 'Delta Kanat', tech: 'wing_delta', stats: { lift: 70, drag: 15, weight: 50, speed: 35, maneuver: 25 }, cost: 250000 }
        ],
        fuselage: [
            { id: 'f_narrow', name: 'Dar Gövde', stats: { capacity: 30, weight: 25, drag: 20 }, cost: 80000 },
            { id: 'f_wide', name: 'Geniş Gövde', stats: { capacity: 80, weight: 60, drag: 45 }, cost: 150000 },
            { id: 'f_cargo', name: 'Kargo Gövde', stats: { capacity: 120, weight: 70, drag: 50 }, cost: 200000 }
        ],
        engines: [
            { id: 'e_small', name: 'Küçük Turbofan', tech: 'engine_turbofan', stats: { thrust: 40, fuel: 20, weight: 25 }, cost: 100000 },
            { id: 'e_medium', name: 'Orta Turbofan', tech: 'engine_turbofan', stats: { thrust: 70, fuel: 35, weight: 40 }, cost: 180000 },
            { id: 'e_turbojet', name: 'Turbojet', tech: 'engine_turbojet', stats: { thrust: 90, fuel: 60, weight: 35, speed: 25 }, cost: 300000 }
        ],
        tail: [
            { id: 't_conventional', name: 'Klasik Kuyruk', stats: { stability: 40, weight: 15, control: 30 }, cost: 30000 },
            { id: 't_twin', name: 'Çift Dikey Kuyruk', stats: { stability: 60, weight: 25, control: 50, stealth: 10 }, cost: 80000 },
            { id: 't_vtail', name: 'V-Kuyruk', stats: { stability: 50, weight: 20, control: 45, drag: -5 }, cost: 60000 }
        ],
        cockpit: [
            { id: 'c_basic', name: 'Analog Kokpit', stats: { safety: 30, weight: 15, cost: -10 }, cost: 20000 },
            { id: 'c_glass', name: 'Cam Kokpit', tech: 'avionics_basic', stats: { safety: 60, weight: 20, navigation: 40 }, cost: 80000 },
            { id: 'c_advanced', name: 'Gelişmiş Kokpit', tech: 'avionics_advanced', stats: { safety: 85, weight: 25, navigation: 70, automation: 50 }, cost: 200000 }
        ]
    });

    var TEST_TEMPLATE = Object.freeze([
        { id: 'wind_tunnel', name: 'Rüzgar Tüneli Testi', cost: 50000, duration: 5000, benefit: 'Aerodinamik verimlilik analizi', bonusType: 'speed', bonusAmount: 20 },
        { id: 'static', name: 'Statik Yük Testi', cost: 100000, duration: 8000, benefit: 'Yapısal dayanıklılık kontrolü', bonusType: 'safety', bonusAmount: 15 },
        { id: 'taxi', name: 'Taksi Testi', cost: 30000, duration: 3000, benefit: 'Yer performansı değerlendirmesi', bonusType: null, bonusAmount: 0 },
        { id: 'flight', name: 'İlk Uçuş', cost: 200000, duration: 15000, benefit: 'Tam uçuş sertifikasyonu', requiresDesign: true, bonusType: null, bonusAmount: 0 }
    ]);

    var MARKET_TEMPLATE = Object.freeze([
        { id: 'order_1', customer: 'Regional Airlines', type: 'Yolcu', quantity: 5, price: 15000000, requirements: { range: 1000, capacity: 50 }, deadline: 30 },
        { id: 'order_2', customer: 'Cargo Express', type: 'Kargo', quantity: 3, price: 25000000, requirements: { range: 3000, capacity: 100 }, deadline: 45 },
        { id: 'order_3', customer: 'Air Force', type: 'Askeri', quantity: 10, price: 80000000, requirements: { speed: 800, maneuver: 60 }, deadline: 60 }
    ]);

    // SVG path data for morphing
    var SVG_PATHS = {
        wings: {
            default: 'M 50 150 L 200 130 L 350 150 L 200 170 Z',
            w_basic: 'M 50 150 L 200 130 L 350 150 L 200 170 Z',
            w_swept: 'M 70 155 L 200 125 L 330 145 L 200 168 Z',
            w_delta: 'M 120 155 L 200 100 L 280 155 L 200 165 Z'
        },
        fuselage: {
            default: { rx: 120, ry: 25 },
            f_narrow: { rx: 110, ry: 20 },
            f_wide: { rx: 130, ry: 32 },
            f_cargo: { rx: 140, ry: 38 }
        },
        tail: {
            default: 'M 80 150 L 40 100 L 60 100 L 100 150 Z',
            t_conventional: 'M 80 150 L 40 100 L 60 100 L 100 150 Z',
            t_twin: 'M 75 150 L 35 95 L 50 95 L 70 130 L 90 95 L 105 95 L 110 150 Z',
            t_vtail: 'M 80 150 L 30 105 L 50 110 L 80 140 L 110 110 L 130 105 L 120 150 Z'
        },
        engines: {
            default: [{ x: 120, y: 165, w: 40, h: 15 }, { x: 240, y: 165, w: 40, h: 15 }],
            e_small: [{ x: 155, y: 168, w: 30, h: 12 }, { x: 215, y: 168, w: 30, h: 12 }],
            e_medium: [{ x: 120, y: 165, w: 40, h: 15 }, { x: 240, y: 165, w: 40, h: 15 }],
            e_turbojet: [{ x: 105, y: 163, w: 50, h: 18 }, { x: 245, y: 163, w: 50, h: 18 }]
        },
        cockpit: {
            default: 'M 280 140 Q 300 135 310 150 Q 300 155 280 150',
            c_basic: 'M 280 142 Q 295 138 305 150 Q 295 155 280 150',
            c_glass: 'M 275 138 Q 300 130 315 150 Q 300 158 275 152',
            c_advanced: 'M 270 136 Q 305 125 320 150 Q 305 162 270 155'
        }
    };

    // Expose data templates
    AF.RESEARCH_TEMPLATE = RESEARCH_TEMPLATE;
    AF.COMPONENT_TEMPLATE = COMPONENT_TEMPLATE;
    AF.TEST_TEMPLATE = TEST_TEMPLATE;
    AF.MARKET_TEMPLATE = MARKET_TEMPLATE;
    AF.SVG_PATHS = SVG_PATHS;

})(window.AeroForge);
