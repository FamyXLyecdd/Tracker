import { NextRequest, NextResponse } from "next/server";
import {
    getAccounts,
    setAccounts,
    getEventsLimited,
    addEvent,
    sendWebhook,
    queueCommand
} from "@/lib/store";
import { verify } from "@/lib/jwt";

// Middleware to verify auth
async function requireAuth(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

    const token = authHeader.split(" ")[1];
    const payload = await verify(token);
    return payload !== null;
}

// GET - List all accounts
export async function GET(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const accounts = await getAccounts();
    const events = await getEventsLimited(50);

    // Mark accounts as offline if no heartbeat in 45 seconds
    const now = Date.now();
    let updated = false;

    for (const account of accounts) {
        if (now - account.lastHeartbeat > 45000 && account.status === "online") {
            account.status = "offline";
            updated = true;

            await addEvent({
                id: crypto.randomUUID(),
                type: "disconnect",
                accountId: account.id,
                username: account.username,
                message: `${account.username} timed out (no heartbeat)`,
                timestamp: Date.now(),
            });

            await sendWebhook(
                "🔴 TIMEOUT",
                `**${account.username}** stopped sending signals`,
                0xff3333
            );
        }
    }

    if (updated) {
        await setAccounts(accounts);
    }

    return NextResponse.json({
        accounts,
        events,
        totalOnline: accounts.filter(a => a.status === "online").length,
        totalAccounts: accounts.length,
    });
}

// POST - Send command to specific accounts
export async function POST(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    try {
        const { command, accountIds } = await request.json();

        if (!command) {
            return NextResponse.json({ error: "COMMAND REQUIRED" }, { status: 400 });
        }

        if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
            return NextResponse.json({ error: "ACCOUNT IDS REQUIRED" }, { status: 400 });
        }

        const accounts = await getAccounts();
        const targets = accounts.filter(a => accountIds.includes(a.id) && a.status === "online");

        if (targets.length === 0) {
            return NextResponse.json({ error: "NO ONLINE TARGETS" }, { status: 400 });
        }

        // Queue command for each target
        for (const account of targets) {
            queueCommand(account.id, command);
            await addEvent({
                id: crypto.randomUUID(),
                type: "command",
                accountId: account.id,
                username: account.username,
                message: `Command "${command}" queued for ${account.username}`,
                timestamp: Date.now(),
            });
        }

        await sendWebhook(
            "⚡ COMMAND QUEUED",
            `**${command.toUpperCase()}** sent to ${targets.length} account(s):\n${targets.map(t => `• ${t.username}`).join("\n")}`,
            0xffffff
        );

        return NextResponse.json({
            success: true,
            command,
            targetCount: targets.length,
            targets: targets.map(t => ({ id: t.id, username: t.username })),
        });
    } catch {
        return NextResponse.json({ error: "INVALID REQUEST" }, { status: 400 });
    }
}

// DELETE - Kick an account (queue kick command)
export async function DELETE(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("id");

    if (!accountId) {
        return NextResponse.json({ error: "ACCOUNT ID REQUIRED" }, { status: 400 });
    }

    const accounts = await getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
        return NextResponse.json({ error: "ACCOUNT NOT FOUND" }, { status: 404 });
    }

    // Queue kick command
    queueCommand(account.id, "kick");

    await addEvent({
        id: crypto.randomUUID(),
        type: "command",
        accountId: account.id,
        username: account.username,
        message: `Kick command sent to ${account.username}`,
        timestamp: Date.now(),
    });

    await sendWebhook(
        "🔴 KICK QUEUED",
        `**${account.username}** will be kicked on next heartbeat`,
        0xff3333
    );

    return NextResponse.json({ success: true, kicked: account.username });
}
