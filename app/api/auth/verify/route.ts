import { NextRequest, NextResponse } from "next/server";
import { verify } from "@/lib/jwt";

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "NO TOKEN PROVIDED" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        const payload = await verify(token);

        if (!payload) {
            return NextResponse.json(
                { error: "INVALID TOKEN" },
                { status: 401 }
            );
        }

        return NextResponse.json({
            valid: true,
            role: payload.role,
        });
    } catch {
        return NextResponse.json(
            { error: "VERIFICATION FAILED" },
            { status: 401 }
        );
    }
}
