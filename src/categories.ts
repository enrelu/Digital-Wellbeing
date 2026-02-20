export const DEFAULT_CATEGORIES: Record<string, string> = {
    // Work
    'github.com': 'Work',
    'stackoverflow.com': 'Work',
    'docs.google.com': 'Work',
    'mail.google.com': 'Work',
    'slack.com': 'Work',
    'trello.com': 'Work',
    'linear.app': 'Work',
    'chatgpt.com': 'Work',
    'claude.ai': 'Work',

    // Leisure
    'youtube.com': 'Leisure',
    'netflix.com': 'Leisure',
    'twitch.tv': 'Leisure',
    'primevideo.com': 'Leisure',
    'disneyplus.com': 'Leisure',
    'spotify.com': 'Leisure',

    // Social
    'twitter.com': 'Social',
    'x.com': 'Social',
    'facebook.com': 'Social',
    'instagram.com': 'Social',
    'linkedin.com': 'Social',
    'reddit.com': 'Social',
    'tiktok.com': 'Social',
    'whatsapp.com': 'Social',
    'telegram.org': 'Social',

    // Learning
    'duolingo.com': 'Learning',
    'coursera.org': 'Learning',
    'udemy.com': 'Learning',
    'edx.org': 'Learning',
    'khanacademy.org': 'Learning',
    'platzi.com': 'Learning',
};

export const CATEGORY_COLORS: Record<string, string> = {
    'Work': '#3b82f6', // blue-500
    'Leisure': '#ef4444', // red-500
    'Social': '#8b5cf6', // violet-500
    'Learning': '#10b981', // emerald-500
    'Other': '#6b7280', // gray-500
};

export function getCategoryForDomain(domain: string, userCustomCategories?: Record<string, string>): string {
    if (userCustomCategories && userCustomCategories[domain]) {
        return userCustomCategories[domain];
    }

    // check base domain if subdomains exist (e.g. mail.google.com)
    if (DEFAULT_CATEGORIES[domain]) {
        return DEFAULT_CATEGORIES[domain];
    }

    const parts = domain.split('.');
    if (parts.length > 2) {
        const baseDomain = parts.slice(-2).join('.');
        if (DEFAULT_CATEGORIES[baseDomain]) {
            return DEFAULT_CATEGORIES[baseDomain];
        }
    }

    return 'Other';
}
