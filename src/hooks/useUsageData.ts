import { useState, useEffect } from 'react';

export interface DomainStat {
    domain: string;
    timeSpent: number; // seconds
    visits: number;
}

export interface DayUsage {
    date: string; // YYYY-MM-DD
    stats: DomainStat[];
    sessions: number;
    hourly: Record<number, number>;
}

export function useUsageData() {
    const [data, setData] = useState<DayUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const allData = await chrome.storage.local.get(null);
            const rawDays: DayUsage[] = [];

            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('usageData_')) {
                    const date = key.replace('usageData_', '');
                    const stats: DomainStat[] = [];
                    let sessions = 1;
                    let hourly: Record<number, number> = {};

                    if (typeof value === 'object' && value !== null && 'domains' in value) {
                        const dayData = value as any;
                        sessions = dayData.sessions || 1;
                        hourly = dayData.hourly || {};
                        for (const [domain, dat] of Object.entries(dayData.domains)) {
                            const domData = dat as any;
                            stats.push({ domain, timeSpent: domData.timeSpent, visits: domData.visits });
                        }
                    } else {
                        // Older flat format fallback
                        for (const [domain, timeSpent] of Object.entries(value as Record<string, number>)) {
                            if (typeof timeSpent === 'number') {
                                stats.push({ domain, timeSpent, visits: 1 });
                            }
                        }
                    }

                    rawDays.push({ date, stats, sessions, hourly });
                }
            }

            // Sort descending by date
            rawDays.sort((a, b) => b.date.localeCompare(a.date));
            setData(rawDays);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Auto-refresh when storage changes
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            let needsRefresh = false;
            for (const key of Object.keys(changes)) {
                if (key.startsWith('usageData_')) {
                    needsRefresh = true;
                    break;
                }
            }
            if (needsRefresh) {
                fetchData();
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    return { data, loading, error, refresh: fetchData };
}
