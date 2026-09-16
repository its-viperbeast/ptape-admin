export function getTokenAdminId(token: string): string | number | null {
    try {
        const payloadPart = token.split('.')[1];
        if (!payloadPart) return null;
        const json = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(json));
        return payload.admin_id ?? null;
    } catch {
        return null;
    }
}

function tokenCookie(value: string, maxAge: number) {
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    return `token=${value}; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
}

export function setAuthToken(token: string, lastLogin?: string | null) {
    localStorage.setItem('token', token);
    if (lastLogin) {
        localStorage.setItem('last_login', lastLogin);
    } else {
        localStorage.removeItem('last_login');
    }
    document.cookie = tokenCookie(token, 86400);
}

export function getLastLogin(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('last_login');
}

export function clearAuthToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('last_login');
    document.cookie = tokenCookie('', 0);
}
