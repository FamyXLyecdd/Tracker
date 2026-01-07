import { NextRequest, NextResponse } from "next/server";
import { getWebhookUrl, setWebhookUrl } from "@/lib/store";
import { verify } from "@/lib/jwt";

async function requireAuth(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

    const token = authHeader.split(" ")[1];
    const payload = await verify(token);
    return payload !== null;
}

export async function GET(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    return NextResponse.json({
        url: getWebhookUrl(),
    });
}

export async function POST(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    try {
        const { url } = await request.json();

        if (url && typeof url === "string") {
            // Validate Discord webhook URL format
            if (!url.startsWith("https://discord.com/api/webhooks/") &&
                !url.startsWith("https://discordapp.com/api/webhooks/")) {
                return NextResponse.json({ error: "INVALID WEBHOOK URL" }, { status: 400 });
            }
            setWebhookUrl(url);
        } else {
            setWebhookUrl(null);
        }

        return NextResponse.json({ success: true, url: getWebhookUrl() });
    } catch {
        return NextResponse.json({ error: "INVALID REQUEST" }, { status: 400 });
    }
}
