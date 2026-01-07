// Simple JWT implementation for edge runtime
const SECRET = process.env.JWT_SECRET || "pilot-tracker-secret-key-2024";

function base64UrlEncode(str: string): string {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
}

async function hmacSHA256(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray));

    return signatureBase64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export interface JWTPayload {
    role: string;
    iat: number;
    exp?: number;
}

export async function sign(payload: JWTPayload): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };

    // Token expires in 24 hours
    const fullPayload = {
        ...payload,
        exp: payload.exp || Date.now() + 24 * 60 * 60 * 1000,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

    const signature = await hmacSHA256(`${encodedHeader}.${encodedPayload}`, SECRET);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verify(token: string): Promise<JWTPayload | null> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, signature] = parts;

        // Verify signature
        const expectedSignature = await hmacSHA256(`${encodedHeader}.${encodedPayload}`, SECRET);
        if (signature !== expectedSignature) return null;

        // Decode payload
        const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

        // Check expiration
        if (payload.exp && payload.exp < Date.now()) return null;

        return payload;
    } catch {
        return null;
    }
}
