
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const body = await request.json();
        const { provider } = body;

        if (!provider || !['spotify', 'youtube'].includes(provider)) {
            return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
        }

        const cookieStore = cookies();

        // Delete all auth-related cookies for the provider
        cookieStore.delete(`${provider}_access_token`);
        cookieStore.delete(`${provider}_refresh_token`);
        cookieStore.delete(`${provider}_expires_at`);

        return NextResponse.json({ success: true, message: `Disconnected from ${provider}` });
    } catch (error) {
        console.error("Logout Error", error);
        return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }
}
