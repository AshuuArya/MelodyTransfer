
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserPlaylists, getLikedTracks } from '@/lib/spotify';
import { getYouTubePlaylists } from '@/lib/youtube';
import { logError } from '@/lib/utils';

export async function GET(request) {
    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    const cookieStore = await cookies();

    if (!source) {
        return NextResponse.json({ error: 'Source required' }, { status: 400 });
    }

    const token = cookieStore.get(`${source}_access_token`)?.value;

    if (!token) {
        return NextResponse.json({ error: `Not authenticated with ${source}` }, { status: 401 });
    }

    try {
        let data = [];

        if (source === 'spotify') {
            // Parallel fetch for speed
            const [playlistsData, likedData] = await Promise.all([
                getUserPlaylists(token),
                getLikedTracks(token, false) // Optimized: Only get count, don't fetch all tracks yet
            ]);

            data = playlistsData.items ? playlistsData.items.map(p => ({
                id: p.id,
                name: p.name,
                image: p.images?.[0]?.url,
                trackCount: p.tracks?.total,
                provider: 'spotify'
            })) : [];

            // Add "Liked Songs"
            data.unshift({
                id: 'liked_songs',
                name: 'Liked Songs',
                image: '/images/spotify-liked.png', // Ensure this asset exists or use a generic one
                trackCount: likedData.total,
                provider: 'spotify',
                isLikedSongs: true
            });

        } else if (source === 'youtube') {
            const playlistsData = await getYouTubePlaylists(token);

            data = playlistsData.items ? playlistsData.items.map(p => ({
                id: p.id,
                name: p.snippet.title,
                image: p.snippet.thumbnails?.medium?.url,
                trackCount: p.contentDetails?.itemCount,
                provider: 'youtube'
            })) : [];
        }

        return NextResponse.json({ playlists: data });

    } catch (error) {
        logError(error, `Data Fetch Error (${source})`);

        if (error.code === 'AUTH_EXPIRED') {
            return NextResponse.json({ error: 'Session expired', code: 'AUTH_EXPIRED' }, { status: 401 });
        }

        return NextResponse.json({
            error: `Failed to fetch data from ${source}`,
            details: error.message
        }, { status: 500 });
    }
}
