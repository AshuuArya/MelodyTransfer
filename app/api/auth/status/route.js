
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshSpotifyToken } from '@/lib/spotify';
import { refreshYouTubeToken } from '@/lib/youtube';

export async function GET() {
    const cookieStore = await cookies();

    // Helper to check and refresh token for a specific provider and role
    const checkToken = async (provider, role) => {
        const accessName = `${provider}_${role}_access_token`;
        const refreshName = `${provider}_${role}_refresh_token`;
        const expiresName = `${provider}_${role}_expires_at`;

        let token = cookieStore.get(accessName)?.value;
        const refreshToken = cookieStore.get(refreshName)?.value;
        let result = { connected: false, user: null, refreshed: false, newToken: null, expiresIn: 0 };

        if (token) {
            result.connected = true;
        } else if (refreshToken) {
            try {
                // Refresh Logic
                let tokens;
                if (provider === 'spotify') tokens = await refreshSpotifyToken(refreshToken);
                else if (provider === 'youtube') tokens = await refreshYouTubeToken(refreshToken);

                if (tokens) {
                    result.connected = true;
                    result.refreshed = true;
                    result.newToken = tokens.access_token;
                    result.expiresIn = tokens.expires_in;
                    token = tokens.access_token; // Use new token for user fetch
                }
            } catch (e) {
                console.error(`Failed to refresh ${provider} ${role}`, e);
            }
        }

        // Fetch User if Connected
        if (result.connected && token) {
            try {
                const lib = provider === 'spotify' ? await import('@/lib/spotify') : await import('@/lib/youtube');
                result.user = await lib.getCurrentUser(token);
            } catch (e) {
                console.error(`Failed to fetch user for ${provider} ${role}`, e);
            }
        }

        return result;
    };

    // Parallel checks
    const [spSource, spDest, ytSource, ytDest] = await Promise.all([
        checkToken('spotify', 'source'),
        checkToken('spotify', 'dest'),
        checkToken('youtube', 'source'),
        checkToken('youtube', 'dest')
    ]);

    const status = {
        spotify: { source: spSource, dest: spDest },
        youtube: { source: ytSource, dest: ytDest }
    };

    const response = NextResponse.json(status);

    // Helper to set cookie on response
    const setRefreshedCookie = (provider, role, data) => {
        if (data.refreshed) {
            response.cookies.set(`${provider}_${role}_access_token`, data.newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: data.expiresIn,
                sameSite: 'lax'
            });
            response.cookies.set(`${provider}_${role}_expires_at`, (Date.now() + data.expiresIn * 1000).toString(), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                sameSite: 'lax'
            });
        }
    };

    setRefreshedCookie('spotify', 'source', spSource);
    setRefreshedCookie('spotify', 'dest', spDest);
    setRefreshedCookie('youtube', 'source', ytSource);
    setRefreshedCookie('youtube', 'dest', ytDest);

    return response;
}
