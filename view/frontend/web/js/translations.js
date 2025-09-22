(function (global) {
    'use strict';

    // Internal dictionary (initialized lazily)
    let DICT = (global.HYVA_DEFAULT_TRANSLATIONS && typeof global.HYVA_DEFAULT_TRANSLATIONS === 'object')
        ? global.HYVA_DEFAULT_TRANSLATIONS
        : {};

    let DICT_READY = (DICT && Object.keys(DICT).length > 0);

    function ensureDict() {
        try {
            if (typeof DICT === 'undefined' || DICT === null) {
                DICT = {};
            }
        } catch (e) {
            DICT = {};
        }
        if ((!DICT || Object.keys(DICT).length === 0) && global.HYVA_DEFAULT_TRANSLATIONS && typeof global.HYVA_DEFAULT_TRANSLATIONS === 'object') {
            DICT = global.HYVA_DEFAULT_TRANSLATIONS;
            DICT_READY = Object.keys(DICT).length > 0;
        }
        if (!DICT || typeof DICT !== 'object') DICT = {};
    }

    // Replace %1 %2 ... with params (1-based)
    function replaceNumberedPlaceholders(str, params) {
        if (!params || params.length === 0) return str;
        let out = String(str);
        for (let i = 0; i < params.length; i++) {
            const token = '%' + (i + 1);
            out = out.split(token).join(String(params[i]));
        }
        return out;
    }

    // Replace {name} placeholders using object map
    function replaceNamedPlaceholders(str, map) {
        if (!map || typeof map !== 'object') return str;
        return String(str).replace(/\{([^\}]+)\}/g, (m, key) => {
            return (key in map) ? String(map[key]) : m;
        });
    }

    // Synchronous translate
    function translate(key /* , ...params */) {
        if (key === null || key === undefined) return '';

        ensureDict();

        const phraseKey = String(key);
        let translated = (DICT && Object.prototype.hasOwnProperty.call(DICT, phraseKey)) ? DICT[phraseKey] : phraseKey;

        if (arguments.length <= 1) return translated;

        const params = Array.prototype.slice.call(arguments, 1);
        if (params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0])) {
            return replaceNamedPlaceholders(translated, params[0]);
        }
        return replaceNumberedPlaceholders(translated, params);
    }

    // Allow external code to set/merge translations programmatically
    function setTranslations(obj, merge = true) {
        if (!obj || typeof obj !== 'object') return;
        if (merge) {
            DICT = Object.assign({}, DICT, obj);
        } else {
            DICT = Object.assign({}, obj);
        }
        global.HYVA_DEFAULT_TRANSLATIONS = DICT;
        DICT_READY = Object.keys(DICT).length > 0;
        const ev = new CustomEvent('hyva:translations:updated', { detail: { translations: DICT }});
        try { global.dispatchEvent(ev); } catch(e) { /* ignore */ }
    }

    function getTranslations() {
        ensureDict();
        return DICT;
    }

    // expose globals
    global.$t = translate;
    global.HyvaTranslations = {
        t: translate,
        set: setTranslations,
        get: getTranslations,
        // convenience: force pickup from global var immediately (merge=false by default)
        pickup: function (merge = false) {
            if (global.HYVA_DEFAULT_TRANSLATIONS && typeof global.HYVA_DEFAULT_TRANSLATIONS === 'object') {
                setTranslations(global.HYVA_DEFAULT_TRANSLATIONS, merge);
            }
        },
        // refresh hook for DOM updates (if you keep refresh implementation)
        refresh: function (selector) {
            // minimal DOM refresh (keeps compatibility if you use data-i18n-key)
            try {
                const sel = selector || '[data-i18n-key]';
                if (typeof document === 'undefined') return;
                const nodes = document.querySelectorAll(sel);
                nodes.forEach(node => {
                    const key = node.getAttribute('data-i18n-key');
                    if (!key) return;
                    const rawParams = node.getAttribute('data-i18n-params');
                    let result;
                    if (rawParams) {
                        try {
                            const parsed = JSON.parse(rawParams);
                            result = translate(key, parsed);
                        } catch (e) {
                            const parts = rawParams.split(',').map(p => p.trim());
                            result = translate.apply(null, [key].concat(parts));
                        }
                    } else {
                        result = translate(key);
                    }
                    if ('value' in node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')) {
                        node.value = result;
                    } else {
                        node.textContent = result;
                    }
                });
            } catch (e) { /* ignore */ }
        }
    };

    // Alpine integration (register $t magic)
    function registerAlpineMagic(Alpine) {
        try {
            if (typeof Alpine.magic === 'function') {
                Alpine.magic('t', function () {
                    return function () {
                        return translate.apply(null, arguments);
                    };
                });
            }
        } catch (e) { /* ignore */ }
    }

    if (global.Alpine) {
        registerAlpineMagic(global.Alpine);
    } else {
        const MAX_ATTEMPTS = 20;
        let attempts = 0;
        const poll = setInterval(() => {
            attempts++;
            if (global.Alpine) {
                clearInterval(poll);
                registerAlpineMagic(global.Alpine);
                return;
            }
            if (attempts >= MAX_ATTEMPTS) clearInterval(poll);
        }, 50);
    }

    // pickup short window: if window.HYVA_DEFAULT_TRANSLATIONS injected shortly after
    if (!global.HYVA_DEFAULT_TRANSLATIONS || Object.keys(global.HYVA_DEFAULT_TRANSLATIONS).length === 0) {
        const MAX_PICKUP = 40;
        let pickupAttempts = 0;
        const pickup = setInterval(() => {
            pickupAttempts++;
            if (global.HYVA_DEFAULT_TRANSLATIONS && typeof global.HYVA_DEFAULT_TRANSLATIONS === 'object'
                && Object.keys(global.HYVA_DEFAULT_TRANSLATIONS).length > 0) {
                setTranslations(global.HYVA_DEFAULT_TRANSLATIONS, false);
                clearInterval(pickup);
                return;
            }
            if (pickupAttempts >= MAX_PICKUP) clearInterval(pickup);
        }, 25);
    }

    // explicit injection event
    function onInjectEvent(e) {
        if (!e || !e.detail || !e.detail.translations) return;
        setTranslations(e.detail.translations, true);
    }
    try { global.addEventListener('hyva:translations:inject', onInjectEvent); } catch (e) { /* ignore */ }

})(window);
