export interface DomainData {
    timeSpent: number;
    visits: number;
}
export interface DayData {
    domains: Record<string, DomainData>;
    sessions: number;
    hourly: Record<number, number>;
}

let activeTabId: number | null = null;
let activeDomain: string | null = null;
let startTime: number | null = null;
let isWindowFocused: boolean = true;
let lastUnfocusTime: number = 0;
let currentVisitRecorded: boolean = true;

// Utility to get today's date string YYYY-MM-DD
function getTodayDateString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Extract domain from URL
function getDomain(url: string | undefined): string | null {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
            return urlObj.hostname;
        }
        return null; // Ignore chrome://, edge://, etc.
    } catch (e) {
        return null;
    }
}

// Helper to increment session
async function incrementSession() {
    const dateString = getTodayDateString();
    const storageKey = `usageData_${dateString}`;
    try {
        const data = await chrome.storage.local.get(storageKey);
        let rawDayData: any = data[storageKey];
        if (!rawDayData || typeof rawDayData !== 'object' || !rawDayData.domains) {
            rawDayData = { domains: {}, sessions: 1, hourly: {} } as DayData;
        } else {
            rawDayData.sessions = (rawDayData.sessions || 0) + 1;
        }
        await chrome.storage.local.set({ [storageKey]: rawDayData });
    } catch (e) {
        console.error(e);
    }
}

// Function to save accumulated time
async function saveTime() {
    console.log(`Intentando saveTime. Domain: ${activeDomain} | StartTime: ${startTime}`);
    // Only block saving if domain or startTime are null. Ignore isWindowFocused here since we want to save the time *before* focus was lost.
    if (!activeDomain || !startTime) return;

    const endTime = Date.now();
    const timeSpentSeconds = Math.floor((endTime - startTime) / 1000);

    if (timeSpentSeconds <= 0) {
        startTime = Date.now(); // reset
        return;
    }

    const currentHour = new Date().getHours();
    const dateString = getTodayDateString();
    const storageKey = `usageData_${dateString}`;

    try {
        const data = await chrome.storage.local.get(storageKey);
        let rawDayData: any = data[storageKey];

        // Migrate or init
        if (!rawDayData || typeof rawDayData !== 'object' || !rawDayData.domains) {
            const oldRecord = (rawDayData || {}) as Record<string, number>;
            rawDayData = { domains: {}, sessions: 1, hourly: {} } as DayData;
            for (const [dom, time] of Object.entries(oldRecord)) {
                if (typeof time === 'number') {
                    rawDayData.domains[dom] = { timeSpent: time, visits: 1 };
                }
            }
        }

        const dayData = rawDayData as DayData;

        if (!dayData.domains[activeDomain]) {
            dayData.domains[activeDomain] = { timeSpent: 0, visits: 0 };
        }

        dayData.domains[activeDomain].timeSpent += timeSpentSeconds;

        if (!currentVisitRecorded) {
            dayData.domains[activeDomain].visits += 1;
            currentVisitRecorded = true;
        }

        dayData.hourly[currentHour] = (dayData.hourly[currentHour] || 0) + timeSpentSeconds;

        await chrome.storage.local.set({ [storageKey]: dayData });
        console.log(`TIEMPO GUARDADO EXITÓSAMENTE: ${timeSpentSeconds}s añadidos al dominio ${activeDomain}`);
    } catch (error) {
        console.error("Error saving time spent:", error);
    }

    // Reset start time to now
    startTime = Date.now();
}

// Update the current active domain and start timer
async function updateActiveTab(tabId: number, url?: string) {
    console.log(`updateActiveTab lanzado para Tab: ${tabId}, URL original: ${url}`);
    await saveTime();
    activeTabId = tabId;
    const domain = getDomain(url);

    if (domain) {
        if (domain !== activeDomain) {
            currentVisitRecorded = false; // New visit started
        }
        console.log(`Dominio capturado y guardando como activo: ${domain}`);
        activeDomain = domain;
        startTime = Date.now();
    } else {
        console.log(`Desactivando timer. Dominio final nulo u omitido.`);
        activeDomain = null;
        startTime = null;
    }
}

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        await updateActiveTab(tab.id as number, tab.url);
    } catch (e) {
        await updateActiveTab(activeInfo.tabId, undefined);
    }
});

// Listen for URL updates in the active tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (tabId === activeTabId && (changeInfo.url || changeInfo.status === 'complete')) {
        await updateActiveTab(tabId, tab.url);
    }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    isWindowFocused = windowId !== chrome.windows.WINDOW_ID_NONE;

    if (!isWindowFocused) {
        lastUnfocusTime = Date.now();
        // Window lost focus, save time and pause timer
        await saveTime();
        activeDomain = null;
        startTime = null;
    } else {
        // Did we return after 5 minutes? Session bump!
        if (Date.now() - lastUnfocusTime > 5 * 60 * 1000) {
            await incrementSession();
        }
        // Window regained focus, restart timer for active tab
        try {
            const [tab] = await chrome.tabs.query({ active: true, windowId: windowId });
            if (tab && tab.id) {
                await updateActiveTab(tab.id, tab.url);
            }
        } catch (e) {
            console.error(e);
        }
    }
});

// Initialize on startup, install, or worker wake-up
async function initializeState() {
    await incrementSession();
    try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab && tab.id) {
            await updateActiveTab(tab.id, tab.url);
        } else {
            // Fallback si no hay window focused
            const [anyActiveTab] = await chrome.tabs.query({ active: true });
            if (anyActiveTab && anyActiveTab.id) {
                await updateActiveTab(anyActiveTab.id, anyActiveTab.url);
            }
        }
    } catch (e) {
        console.error("Init error", e);
    }
}

chrome.runtime.onStartup.addListener(initializeState);
chrome.runtime.onInstalled.addListener(initializeState);

// Wake up the service worker immediately and find the active tab
initializeState();

// Save periodically using chrome.alarms for Manifest V3 reliability
chrome.alarms.create("saveTimeAlarm", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "saveTimeAlarm") {
        saveTime();
    }
});

// Save data when the extension is suspended/closed
chrome.runtime.onSuspend.addListener(() => {
    saveTime();
});
