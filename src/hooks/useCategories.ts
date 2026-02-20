import { useState, useEffect } from 'react';

const STORAGE_KEY = 'userCustomCategories';

export type CustomCategories = Record<string, string>;

export function useCategories() {
    const [customCategories, setCustomCategories] = useState<CustomCategories>({});
    const [loading, setLoading] = useState(true);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const result = await chrome.storage.sync.get(STORAGE_KEY);
            if (result[STORAGE_KEY]) {
                setCustomCategories(result[STORAGE_KEY] as CustomCategories);
            }
        } catch (e) {
            console.error('Error loading custom categories:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();

        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'sync' && changes[STORAGE_KEY]) {
                setCustomCategories((changes[STORAGE_KEY].newValue || {}) as CustomCategories);
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const setCategory = async (domain: string, category: string) => {
        try {
            const newCategories = { ...customCategories, [domain]: category };
            await chrome.storage.sync.set({ [STORAGE_KEY]: newCategories });
            // The onChanged listener will update the local state automatically
        } catch (e) {
            console.error('Error saving custom category:', e);
        }
    };

    return { customCategories, loadingCategories: loading, setCategory };
}
