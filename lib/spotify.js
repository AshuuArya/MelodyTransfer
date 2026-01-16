
import { config } from './config';
import { withRetry, spotifyLimiter, handleApiResponse, AppError } from './utils';

const BASIC_AUTH = Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString('base64');

// --- Auth Helpers ---

export const getSpotifyAuthURL = (redirect_uri, state) => {
    const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative user-library-read playlist-modify-public playlist-modify-private';
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.spotify.clientId,
        scope,
        redirect_uri,
        state,
    });
    return `${config.spotify.authUrl}?${params.toString()}`;
};

export const getSpotifyTokens = async (code, redirect_uri) => {
    const response = await fetch(config.spotify.tokenUrl, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${BASIC_AUTH}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri,
        }),
    });

    if (!response.ok) {
        throw new AppError('Failed to get Spotify tokens', 'AUTH_ERROR', await response.json());
    }
    return response.json();
};

export const refreshSpotifyToken = async (refresh_token) => {
    const response = await fetch(config.spotify.tokenUrl, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${BASIC_AUTH}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token,
        }),
    });

    if (!response.ok) {
        throw new AppError('Failed to refresh Spotify token', 'AUTH_REFRESH_ERROR', await response.json());
    }
    return response.json();
};

// --- Generic Fetcher ---

const fetchSpotify = async (endpoint, accessToken, options = {}) => {
    return withRetry(async () => {
        await spotifyLimiter.getToken();

        const url = endpoint.startsWith('http') ? endpoint : `${config.spotify.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        return handleApiResponse(response, 'spotify');
    });
};

// --- Data Fetching ---

export const getUserPlaylists = async (accessToken) => {
    let allPlaylists = [];
    let nextUrl = '/me/playlists?limit=50'; // Max limit

    while (nextUrl) {
        const data = await fetchSpotify(nextUrl, accessToken);
        if (data.items) {
            allPlaylists = [...allPlaylists, ...data.items];
        }
        nextUrl = data.next;
    }

    return { items: allPlaylists, total: allPlaylists.length }; // Return unified structure
};

export const getLikedTracks = async (accessToken, fetchAll = true) => {
    let allTracks = [];
    let nextUrl = '/me/tracks?limit=50';

    // Initial fetch to get total and first page
    const data = await fetchSpotify(nextUrl, accessToken);
    if (data.items) {
        allTracks = [...data.items];
    }

    if (!fetchAll) {
        return { items: allTracks, total: data.total };
    }

    // Safety limit to prevent infinite loops or excessive usage in this demo
    // In production, might want 'cursor' based fetching or user confirmation for huge libraries
    let pages = 0;
    const MAX_PAGES = 50; // Fetch up to 2500 songs max for now

    nextUrl = data.next;

    while (nextUrl && pages < MAX_PAGES) {
        const res = await fetchSpotify(nextUrl, accessToken);
        if (res.items) {
            allTracks = [...allTracks, ...res.items];
        }
        nextUrl = res.next;
        pages++;
    }

    return { items: allTracks, total: data.total || allTracks.length };
};

export const getPlaylistTracks = async (accessToken, playlistId) => {
    let allTracks = [];
    let nextUrl = `/playlists/${playlistId}/tracks?limit=50`;
    let pages = 0;
    const MAX_PAGES = 50;

    while (nextUrl && pages < MAX_PAGES) {
        const data = await fetchSpotify(nextUrl, accessToken);
        if (data.items) {
            // Filter out null tracks (can happen in Spotify)
            const validTracks = data.items.filter(item => item.track);
            allTracks = [...allTracks, ...validTracks];
        }
        nextUrl = data.next;
        pages++;
    }

    return { items: allTracks, total: allTracks.length };
};

export const searchTrack = async (accessToken, query) => {
    const q = encodeURIComponent(query);
    // Use type=track
    return fetchSpotify(`/search?q=${q}&type=track&limit=1`, accessToken);
};

// --- Write Operations ---

export const createPlaylist = async (accessToken, userId, name, description) => {
    return fetchSpotify(`/users/${userId}/playlists`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
            name,
            description,
            public: false // Default to private for safety
        })
    });
};

export const addTracksToPlaylist = async (accessToken, playlistId, uris) => {
    // Spotify limits to 100 tracks per request
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < uris.length; i += batchSize) {
        const chunk = uris.slice(i, i + batchSize);
        const res = await fetchSpotify(`/playlists/${playlistId}/tracks`, accessToken, {
            method: 'POST',
            body: JSON.stringify({ uris: chunk })
        });
        results.push(res);
    }
    return results;
};

export const getCurrentUser = async (accessToken) => {
    return fetchSpotify('/me', accessToken);
};
