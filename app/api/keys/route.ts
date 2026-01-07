import { NextRequest, NextResponse } from "next/server";
import { getApiKeys, generateApiKey, addApiKey } from "@/lib/store";
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
        keys: getApiKeys(),
    });
}

export async function POST(request: NextRequest) {
    if (!(await requireAuth(request))) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const newKey = generateApiKey();
    addApiKey(newKey);

    return NextResponse.json({
        key: newKey,
        keys: getApiKeys(),
    });
}
