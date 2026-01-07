import { NextRequest, NextResponse } from "next/server";
import { sign } from "@/lib/jwt";

// Password is stored in environment variable for security
// Set ADMIN_PASSWORD in your Vercel environment variables
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pilot2024";

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        if (!password) {
            return NextResponse.json(
                { error: "PASSWORD REQUIRED" },
                { status: 400 }
            );
        }

        if (password !== ADMIN_PASSWORD) {
            return NextResponse.json(
                { error: "ACCESS DENIED" },
                { status: 401 }
            );
        }

        // Generate JWT token
        const token = await sign({ role: "admin", iat: Date.now() });

        return NextResponse.json({
            success: true,
            token,
            message: "ACCESS GRANTED",
        });
    } catch {
        return NextResponse.json(
            { error: "SYSTEM ERROR" },
            { status: 500 }
        );
    }
}
