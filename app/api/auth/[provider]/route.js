
import { NextResponse } from 'next/server';
import { getSpotifyAuthURL, getSpotifyTokens } from '@/lib/spotify';
import { getYouTubeAuthURL, getYouTubeTokens } from '@/lib/youtube';
import { config } from '@/lib/config';
import { cookies } from 'next/headers';

// Remove hardcoded DEV_URL


export async function GET(request, props) {
    const params = await props.params;
    const { provider } = params;

    // Construct base URL from request headers
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const role = url.searchParams.get('role') || 'source'; // Default to source
    const redirect_uri = `${baseUrl}/api/auth/${provider}?role=${role}`; // Persist role in callback URL

    // 1. Redirect to Auth Provider
    if (!code) {
        const state = Math.random().toString(36).substring(7); // In production use signed JWT or proper session
        let authUrl = '';

        if (provider === 'spotify') {
            authUrl = getSpotifyAuthURL(redirect_uri, state);
        } else if (provider === 'youtube') {
            authUrl = getYouTubeAuthURL(redirect_uri, state);
        } else {
            return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
        }

        return NextResponse.redirect(authUrl);
    }

    // 2. Handle Callback (Code Exchange)
    try {
        let tokens = null;
        if (provider === 'spotify') {
            tokens = await getSpotifyTokens(code, redirect_uri);
        } else if (provider === 'youtube') {
            tokens = await getYouTubeTokens(code, redirect_uri);
        }

        if (tokens && tokens.access_token) {
            // Store tokens in cookies
            // Note: In production, encrypt these or store in session DB
            const cookieStore = await cookies();
            const isProd = process.env.NODE_ENV === 'production';

            // Calculate expiration for access token
            const expiresIn = tokens.expires_in || 3600; // Default to 1 hour if not provided

            cookieStore.set(`${provider}_${role}_access_token`, tokens.access_token, {
                httpOnly: true,
                secure: isProd,
                path: '/',
                sameSite: 'lax',
                maxAge: expiresIn
            });

            // Store expires_at
            const expiresAt = Date.now() + (expiresIn * 1000);
            cookieStore.set(`${provider}_${role}_expires_at`, expiresAt.toString(), {
                httpOnly: true,
                secure: isProd,
                path: '/',
                sameSite: 'lax'
            });


            if (tokens.refresh_token) {
                cookieStore.set(`${provider}_${role}_refresh_token`, tokens.refresh_token, {
                    httpOnly: true,
                    secure: isProd,
                    path: '/',
                    sameSite: 'lax',
                    maxAge: 30 * 24 * 60 * 60
                });
            }

            // Redirect to home/dashboard with success flag
            return NextResponse.redirect(`${baseUrl}/?connected=${provider}`);
        } else {
            console.error("Tokens missing access_token", tokens);
            return NextResponse.redirect(`${baseUrl}/?error=auth_failed_no_token`);
        }

    } catch (error) {
        console.error("Auth Callback Error", error);
        return NextResponse.redirect(`${baseUrl}/?error=auth_failed&details=${encodeURIComponent(error.message)}`);
    }
}
