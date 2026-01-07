import { NextRequest, NextResponse } from "next/server";
import { getAccounts, addEvent, sendWebhook } from "@/lib/store";
import { verify } from "@/lib/jwt";

async function requireAuth(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

    const token = authHeader.split(" ")[1];
    const payload = await verify(token);
    return payload !== null;
}

export async function POST(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    try {
        const { command, accountIds, all } = await request.json();

        if (!command) {
            return NextResponse.json({ error: "COMMAND REQUIRED" }, { status: 400 });
        }

        const accounts = getAccounts();
        let targets = accounts;

        if (!all && accountIds && Array.isArray(accountIds)) {
            targets = accounts.filter(a => accountIds.includes(a.id));
        }

        if (targets.length === 0) {
            return NextResponse.json({ error: "NO TARGETS" }, { status: 400 });
        }

        // Log the command for each target
        for (const account of targets) {
            addEvent({
                type: "command",
                accountId: account.id,
                username: account.username,
                message: `Command "${command}" sent to ${account.username}`,
            });
        }

        await sendWebhook(
            "⚡ COMMAND SENT",
            `**${command}** sent to ${targets.length} account(s):\n${targets.map(t => `• ${t.username}`).join("\n")}`,
            0x00aaff
        );

        return NextResponse.json({
            success: true,
            command,
            targetCount: targets.length,
            targets: targets.map(t => t.username),
        });
    } catch {
        return NextResponse.json({ error: "INVALID REQUEST" }, { status: 400 });
    }
}
