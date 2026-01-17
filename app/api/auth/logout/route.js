import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
    const { provider, role } = await request.json();
    const cookieStore = await cookies();

    if (provider && role) {
        cookieStore.delete(`${provider}_${role}_access_token`);
        cookieStore.delete(`${provider}_${role}_refresh_token`);
        cookieStore.delete(`${provider}_${role}_expires_at`);
    } else {
        // Fallback or clear all? For now, do nothing if invalid
    }

    return NextResponse.json({ success: true });
}
