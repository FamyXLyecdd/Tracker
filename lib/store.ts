import { kv } from "@vercel/kv";

// ============================================
// HARDCODED CONFIGURATION (Cannot be changed)
// ============================================
const FIXED_API_KEY = "zaynfamy-pilot-tracker-2024";
const FIXED_WEBHOOK_URL = "https://discord.com/api/webhooks/1458424187210305660/_UBWxpZX0B_EREYLiX300tVlwtU75qN_ydrZLy9xKwgvZ0Y8SaLCHF_l0vkpXGm1AnFJ";

// ============================================
// TYPES
// ============================================
export interface TrackedAccount {
    id: string;
    username: string;
    displayName: string;
    userId: number;
    placeId: number;
    jobId: string;
    gameName: string;
    status: "online" | "offline" | "idle";
    fps: number;
    ping: number;
    lastHeartbeat: number;
    connectedAt: number;
    position?: { x: number; y: number; z: number };
    health?: number;
    maxHealth?: number;
    walkSpeed?: number;
    jumpPower?: number;
    idleTime?: number;
}

export interface TrackerEvent {
    id: string;
    type: "connect" | "disconnect" | "command" | "error" | "heartbeat";
    accountId: string;
    username: string;
    message: string;
    timestamp: number;
}

// ============================================
// KV KEYS
// ============================================
const KV_ACCOUNTS = "tracker:accounts";
const KV_EVENTS = "tracker:events";

// ============================================
// STORAGE FUNCTIONS (Vercel KV)
// ============================================

// Check if KV is available
function isKvAvailable(): boolean {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// In-memory fallback for local development
let memoryAccounts: TrackedAccount[] = [];
let memoryEvents: TrackerEvent[] = [];

export async function getAccounts(): Promise<TrackedAccount[]> {
    if (isKvAvailable()) {
        try {
            const accounts = await kv.get<TrackedAccount[]>(KV_ACCOUNTS);
            return accounts || [];
        } catch {
            return memoryAccounts;
        }
    }
    return memoryAccounts;
}

export async function setAccounts(accounts: TrackedAccount[]): Promise<void> {
    if (isKvAvailable()) {
        try {
            await kv.set(KV_ACCOUNTS, accounts);
        } catch {
            memoryAccounts = accounts;
        }
    } else {
        memoryAccounts = accounts;
    }
}

export async function getEvents(): Promise<TrackerEvent[]> {
    if (isKvAvailable()) {
        try {
            const events = await kv.get<TrackerEvent[]>(KV_EVENTS);
            return events || [];
        } catch {
            return memoryEvents;
        }
    }
    return memoryEvents;
}

export async function setEvents(events: TrackerEvent[]): Promise<void> {
    if (isKvAvailable()) {
        try {
            await kv.set(KV_EVENTS, events);
        } catch {
            memoryEvents = events;
        }
    } else {
        memoryEvents = events;
    }
}

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

export async function addOrUpdateAccount(account: TrackedAccount): Promise<void> {
    const accounts = await getAccounts();
    const index = accounts.findIndex((a) => a.userId === account.userId);
    if (index >= 0) {
        accounts[index] = { ...accounts[index], ...account };
    } else {
        accounts.push(account);
    }
    await setAccounts(accounts);
}

export async function removeAccount(userId: number): Promise<void> {
    const accounts = await getAccounts();
    const filtered = accounts.filter((a) => a.userId !== userId);
    await setAccounts(filtered);
}

export async function getAccountByUserId(userId: number): Promise<TrackedAccount | undefined> {
    const accounts = await getAccounts();
    return accounts.find((a) => a.userId === userId);
}

// ============================================
// EVENT MANAGEMENT
// ============================================

export async function addEvent(event: TrackerEvent): Promise<void> {
    const events = await getEvents();
    events.unshift(event);
    // Keep only latest 100 events
    if (events.length > 100) {
        events.splice(100);
    }
    await setEvents(events);
}

// ============================================
// API KEY (FIXED - Only one key)
// ============================================

export function getApiKeys(): string[] {
    return [FIXED_API_KEY];
}

export function isValidApiKey(key: string): boolean {
    return key === FIXED_API_KEY;
}

export function generateApiKey(): string {
    // Always return the same fixed key
    return FIXED_API_KEY;
}

export function deleteApiKey(_key: string): boolean {
    // Cannot delete the fixed key
    return false;
}

// ============================================
// WEBHOOK (FIXED - Cannot be changed)
// ============================================

export function getWebhookUrl(): string {
    return FIXED_WEBHOOK_URL;
}

export function setWebhookUrl(_url: string): void {
    // No-op: Webhook is hardcoded
}

export async function sendWebhook(
    title: string,
    description: string,
    color: number = 0xffffff,
    fields?: Array<{ name: string; value: string; inline?: boolean }>,
    thumbnailUrl?: string
): Promise<void> {
    if (!FIXED_WEBHOOK_URL) return;

    try {
        const embed: Record<string, unknown> = {
            title,
            description,
            color,
            timestamp: new Date().toISOString(),
            footer: { text: "ZaynFamy Pilot Tracker" },
        };

        if (fields && fields.length > 0) {
            embed.fields = fields;
        }

        if (thumbnailUrl) {
            embed.thumbnail = { url: thumbnailUrl };
        }

        await fetch(FIXED_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
        });
    } catch (error) {
        console.error("Webhook failed:", error);
    }
}

// ============================================
// COMMAND QUEUE (In-memory only for now)
// ============================================
const commandQueue: Map<string, string[]> = new Map();

export function queueCommand(accountId: string, command: string): void {
    const existing = commandQueue.get(accountId) || [];
    existing.push(command);
    commandQueue.set(accountId, existing);
}

export function getAndClearCommands(accountId: string): string[] {
    const commands = commandQueue.get(accountId) || [];
    commandQueue.delete(accountId);
    return commands;
}

// ============================================
// LEGACY ALIASES (for API routes)
// ============================================

export async function updateAccount(account: TrackedAccount): Promise<void> {
    await addOrUpdateAccount(account);
}

export async function getAccount(accountId: string): Promise<TrackedAccount | undefined> {
    const accounts = await getAccounts();
    return accounts.find(a => a.id === accountId);
}

export async function getEventsLimited(count: number = 50): Promise<TrackerEvent[]> {
    const events = await getEvents();
    return events.slice(0, count);
}

