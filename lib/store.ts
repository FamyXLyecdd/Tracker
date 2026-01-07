// In-memory store for accounts with command queue
// For production, use Vercel KV or a database

export interface TrackedAccount {
    id: string;
    apiKey: string;
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
    idleTime?: number;
    health?: number;
    maxHealth?: number;
    walkSpeed?: number;
    jumpPower?: number;
}

export interface TrackerEvent {
    id: string;
    type: "connect" | "disconnect" | "command" | "error" | "heartbeat";
    accountId: string;
    username: string;
    message: string;
    timestamp: number;
}

export interface PendingCommand {
    id: string;
    accountId: string;
    command: string;
    timestamp: number;
}

// Global store (survives hot reloads in development)
declare global {
    // eslint-disable-next-line no-var
    var trackerStore: {
        accounts: Map<string, TrackedAccount>;
        events: TrackerEvent[];
        webhookUrl: string | null;
        apiKeys: Set<string>;
        commandQueue: Map<string, PendingCommand[]>; // accountId -> pending commands
    } | undefined;
}

function getStore() {
    if (!global.trackerStore) {
        global.trackerStore = {
            accounts: new Map(),
            events: [],
            webhookUrl: null,
            apiKeys: new Set(),
            commandQueue: new Map(),
        };
        // Generate some default API keys
        for (let i = 0; i < 10; i++) {
            global.trackerStore.apiKeys.add(generateApiKey());
        }
    }
    return global.trackerStore;
}

export function generateApiKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = "PT-";
    for (let i = 0; i < 16; i++) {
        key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
}

export function getAccounts(): TrackedAccount[] {
    const store = getStore();
    return Array.from(store.accounts.values());
}

export function getAccount(id: string): TrackedAccount | undefined {
    return getStore().accounts.get(id);
}

export function getAccountByUserId(apiKey: string, userId: number): TrackedAccount | undefined {
    const id = `${apiKey}-${userId}`;
    return getStore().accounts.get(id);
}

export function updateAccount(account: TrackedAccount): void {
    const store = getStore();
    store.accounts.set(account.id, account);
}

export function removeAccount(id: string): boolean {
    const store = getStore();
    store.commandQueue.delete(id); // Clean up commands too
    return store.accounts.delete(id);
}

export function getEvents(limit = 100): TrackerEvent[] {
    return getStore().events.slice(-limit);
}

export function addEvent(event: Omit<TrackerEvent, "id" | "timestamp">): TrackerEvent {
    const store = getStore();
    const fullEvent: TrackerEvent = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
    };
    store.events.push(fullEvent);

    // Keep only last 500 events
    if (store.events.length > 500) {
        store.events = store.events.slice(-500);
    }

    return fullEvent;
}

// Command Queue Functions
export function queueCommand(accountId: string, command: string): PendingCommand {
    const store = getStore();
    const pendingCommand: PendingCommand = {
        id: crypto.randomUUID(),
        accountId,
        command,
        timestamp: Date.now(),
    };

    if (!store.commandQueue.has(accountId)) {
        store.commandQueue.set(accountId, []);
    }
    store.commandQueue.get(accountId)!.push(pendingCommand);

    return pendingCommand;
}

export function queueCommandForAll(command: string): number {
    const store = getStore();
    let count = 0;
    for (const account of store.accounts.values()) {
        if (account.status === "online") {
            queueCommand(account.id, command);
            count++;
        }
    }
    return count;
}

export function getAndClearCommands(accountId: string): string[] {
    const store = getStore();
    const commands = store.commandQueue.get(accountId) || [];
    store.commandQueue.delete(accountId);
    return commands.map(c => c.command);
}

export function getWebhookUrl(): string | null {
    return getStore().webhookUrl;
}

export function setWebhookUrl(url: string | null): void {
    getStore().webhookUrl = url;
}

export function isValidApiKey(key: string): boolean {
    return getStore().apiKeys.has(key);
}

export function addApiKey(key: string): void {
    getStore().apiKeys.add(key);
}

export function getApiKeys(): string[] {
    return Array.from(getStore().apiKeys);
}

export async function sendWebhook(
    title: string,
    description: string,
    color: number,
    fields?: { name: string; value: string; inline?: boolean }[],
    thumbnailUrl?: string
): Promise<void> {
    const url = getWebhookUrl();
    if (!url) return;

    try {
        const payload: any = {
            embeds: [{
                title,
                description,
                color,
                timestamp: new Date().toISOString(),
                footer: { text: "ZaynFamy Pilot Tracker" },
            }],
        };

        if (fields) {
            payload.embeds[0].fields = fields;
        }

        if (thumbnailUrl) {
            payload.embeds[0].thumbnail = { url: thumbnailUrl };
        }

        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Webhook failed:", error);
    }
}
