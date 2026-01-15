
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshSpotifyToken } from '@/lib/spotify';
import { refreshYouTubeToken } from '@/lib/youtube';

export async function GET() {
    const cookieStore = await cookies();
    const status = {
        spotify: false,
        youtube: false,
        user: null
    };

    // Check Spotify
    let spToken = cookieStore.get('spotify_access_token')?.value;
    const spRefresh = cookieStore.get('spotify_refresh_token')?.value;
    const spExpiresAt = parseInt(cookieStore.get('spotify_expires_at')?.value || '0');

    if (spToken) {
        status.spotify = true;
    } else if (spRefresh) {
        // Try refresh
        try {
            const tokens = await refreshSpotifyToken(spRefresh);
            // We can't set cookies in GET handler response easily if we are just returning JSON?
            // Actually Next.js API Routes allow setting cookies on the response object.
            // But here we are returning JSON. We need to construct response.
            status.spotify = true;
            status.spotifyRefreshed = true;
            status.newSpotifyToken = tokens.access_token; // Client can't set httpOnly, so we should set it in header
            status.expiresIn = tokens.expires_in;
        } catch (e) {
            console.error("Failed to auto-refresh Spotify", e);
        }
    }

    // Check YouTube
    let ytToken = cookieStore.get('youtube_access_token')?.value;
    const ytRefresh = cookieStore.get('youtube_refresh_token')?.value;

    if (ytToken) {
        status.youtube = true;
    } else if (ytRefresh) {
        // Try refresh logic similar to above
        try {
            const tokens = await refreshYouTubeToken(ytRefresh);
            status.youtube = true;
            status.youtubeRefreshed = true;
            status.newYoutubeToken = tokens.access_token;
            status.ytExpiresIn = tokens.expires_in;
        } catch (e) {
            console.error("Failed to auto-refresh YouTube", e);
        }
    }

    // Construct response to set cookies if refreshed
    const response = NextResponse.json(status);

    if (status.spotifyRefreshed) {
        response.cookies.set('spotify_access_token', status.newSpotifyToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: status.expiresIn
        });
        // Update expires_at
        response.cookies.set('spotify_expires_at', (Date.now() + status.expiresIn * 1000).toString(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
    }

    if (status.youtubeRefreshed) {
        response.cookies.set('youtube_access_token', status.newYoutubeToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: status.ytExpiresIn
        });
    }

    return response;
}
