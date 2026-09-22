/*
 * @name            jPulse Framework / Plugins / AI Core / WebApp / View / jPulse Navigation
 * @tagline         Admin and plugin navigation for AI Core
 * @description     Appends AI usage to admin and AI Core to jPulse Plugins
 * @file            plugins/ai-core/webapp/view/jpulse-navigation.js
 * @version         1.0.16
 * @release         2026-09-22
 * @repository      https://github.com/jpulse-net/plugin-ai-core
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

if (window.jPulseNavigation?.site?.admin?.pages) {
    window.jPulseNavigation.site.admin.pages.aiUsage = {
        label: '{{i18n.view.ui.ai.usage.nav}}',
        url: '/admin/ai-usage.shtml',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>'
    };
}

if (window.jPulseNavigation?.site?.jPulsePlugins) {
    window.jPulseNavigation.site.jPulsePlugins.pages.aiCore = {
        label: 'AI Core',
        url: '/jpulse-plugins/ai-core.shtml',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>'
    };
}

// EOF plugins/ai-core/webapp/view/jpulse-navigation.js
