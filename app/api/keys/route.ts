import { NextRequest, NextResponse } from "next/server";
import { getApiKeys } from "@/lib/store";
import { verify } from "@/lib/jwt";

// Middleware to verify auth
async function requireAuth(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

    const token = authHeader.split(" ")[1];
    const payload = await verify(token);
    return payload !== null;
}

// GET - Get the fixed API key
export async function GET(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const keys = getApiKeys();

    return NextResponse.json({
        keys,
        message: "This is the only API key - it cannot be changed or deleted"
    });
}

// POST - Cannot generate new keys (fixed key only)
export async function POST(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const keys = getApiKeys();
    return NextResponse.json({
        keys,
        message: "API key is fixed and cannot be regenerated"
    });
}

// DELETE - Cannot delete the fixed key
export async function DELETE(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    return NextResponse.json({
        error: "KEY_READONLY",
        message: "The API key is fixed and cannot be deleted"
    }, { status: 403 });
}
