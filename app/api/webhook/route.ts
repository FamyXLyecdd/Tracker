import { NextRequest, NextResponse } from "next/server";
import { getWebhookUrl } from "@/lib/store";
import { verify } from "@/lib/jwt";

// Middleware to verify auth
async function requireAuth(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

    const token = authHeader.split(" ")[1];
    const payload = await verify(token);
    return payload !== null;
}

// GET - Get current webhook URL (masked)
export async function GET(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const url = getWebhookUrl();
    // Mask the webhook URL for security
    const masked = url ? url.slice(0, 50) + "..." : "";

    return NextResponse.json({
        webhook: masked,
        isSet: !!url,
        readonly: true // Indicate that webhook cannot be changed
    });
}

// POST - Webhook is hardcoded, cannot be changed
export async function POST(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    return NextResponse.json({
        error: "WEBHOOK_READONLY",
        message: "Webhook URL is hardcoded and cannot be changed"
    }, { status: 403 });
}
