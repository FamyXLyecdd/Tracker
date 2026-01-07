import { NextRequest, NextResponse } from "next/server";
import {
    updateAccount,
    getAccount,
    removeAccount,
    addEvent,
    sendWebhook,
    isValidApiKey,
    getAndClearCommands,
    TrackedAccount
} from "@/lib/store";

// This endpoint is called by the Lua script
// No auth token needed - uses API key

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { apiKey, action, ...accountData } = data;

        if (!apiKey) {
            return NextResponse.json({ error: "API_KEY_REQUIRED" }, { status: 400 });
        }

        if (!isValidApiKey(apiKey)) {
            return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 });
        }

        const accountId = `${apiKey}-${accountData.userId}`;

        switch (action) {
            case "connect": {
                const account: TrackedAccount = {
                    id: accountId,
                    apiKey,
                    username: accountData.username || "Unknown",
                    displayName: accountData.displayName || accountData.username || "Unknown",
                    userId: accountData.userId || 0,
                    placeId: accountData.placeId || 0,
                    jobId: accountData.jobId || "",
                    gameName: accountData.gameName || "Unknown Game",
                    status: "online",
                    fps: accountData.fps || 0,
                    ping: accountData.ping || 0,
                    lastHeartbeat: Date.now(),
                    connectedAt: Date.now(),
                    position: accountData.position,
                    health: accountData.health,
                    maxHealth: accountData.maxHealth,
                    walkSpeed: accountData.walkSpeed,
                    jumpPower: accountData.jumpPower,
                };

                updateAccount(account);

                addEvent({
                    type: "connect",
                    accountId: account.id,
                    username: account.username,
                    message: `${account.username} connected from ${account.gameName}`,
                });

                await sendWebhook(
                    "🟢 CONNECTED",
                    `**${account.username}** is now online`,
                    0x00ff00, // Green
                    [
                        { name: "Game", value: account.gameName || "Unknown", inline: true },
                        { name: "Server ID", value: account.jobId ? `\`${account.jobId.slice(0, 8)}...\`` : "N/A", inline: true },
                        { name: "Stats", value: `FPS: ${account.fps} | Ping: ${account.ping}ms`, inline: false }
                    ],
                    `https://www.roblox.com/headshot-thumbnail/image?userId=${account.userId}&width=420&height=420&format=png`
                );

                return NextResponse.json({ success: true, id: account.id });
            }

            case "heartbeat": {
                const existing = getAccount(accountId);

                if (existing) {
                    existing.lastHeartbeat = Date.now();
                    existing.status = "online";
                    existing.fps = accountData.fps ?? existing.fps;
                    existing.ping = accountData.ping ?? existing.ping;
                    existing.position = accountData.position ?? existing.position;
                    existing.gameName = accountData.gameName ?? existing.gameName;
                    existing.placeId = accountData.placeId ?? existing.placeId;
                    existing.jobId = accountData.jobId ?? existing.jobId;
                    existing.health = accountData.health ?? existing.health;
                    existing.maxHealth = accountData.maxHealth ?? existing.maxHealth;
                    existing.walkSpeed = accountData.walkSpeed ?? existing.walkSpeed;
                    existing.jumpPower = accountData.jumpPower ?? existing.jumpPower;
                    updateAccount(existing);
                }

                // Get and clear pending commands for this account
                const commands = getAndClearCommands(accountId);

                return NextResponse.json({
                    success: true,
                    commands // Return pending commands to execute
                });
            }

            case "disconnect": {
                const existing = getAccount(accountId);

                if (existing) {
                    addEvent({
                        type: "disconnect",
                        accountId: existing.id,
                        username: existing.username,
                        message: `${existing.username} disconnected`,
                    });

                    await sendWebhook(
                        "🔴 DISCONNECTED",
                        `**${existing.username}** disconnected from tracking`,
                        0xff3333
                    );

                    removeAccount(accountId);
                }

                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
        }
    } catch (error) {
        console.error("Tracker error:", error);
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
}

// GET - Get commands for a specific account (polled by Lua script)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get("key");
    const userId = searchParams.get("userId");

    if (!apiKey || !isValidApiKey(apiKey)) {
        return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 });
    }

    if (!userId) {
        return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    const accountId = `${apiKey}-${userId}`;
    const commands = getAndClearCommands(accountId);

    return NextResponse.json({ commands });
}
