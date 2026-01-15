
import { config } from './config';
import { withRetry, youtubeLimiter, handleApiResponse, AppError } from './utils';

// --- Auth Helpers ---

export const getYouTubeAuthURL = (redirect_uri, state) => {
    const scope = [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.readonly'
    ].join(' ');

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.youtube.clientId,
        scope,
        redirect_uri,
        state,
        access_type: 'offline', // Request refresh token
        prompt: 'consent' // Force consent to ensure we get refresh token
    });
    return `${config.youtube.authUrl}?${params.toString()}`;
};

export const getYouTubeTokens = async (code, redirect_uri) => {
    const response = await fetch(config.youtube.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            code,
            client_id: config.youtube.clientId,
            client_secret: config.youtube.clientSecret,
            redirect_uri,
            grant_type: 'authorization_code',
        }),
    });

    if (!response.ok) {
        throw new AppError('Failed to get YouTube tokens', 'AUTH_ERROR', await response.json());
    }
    return response.json();
};

export const refreshYouTubeToken = async (refresh_token) => {
    const response = await fetch(config.youtube.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: config.youtube.clientId,
            client_secret: config.youtube.clientSecret,
            grant_type: 'refresh_token',
            refresh_token,
        }),
    });

    if (!response.ok) {
        throw new AppError('Failed to refresh YouTube token', 'AUTH_REFRESH_ERROR', await response.json());
    }
    return response.json();
};

// --- Generic Fetcher ---

const fetchYouTube = async (endpoint, accessToken, options = {}) => {
    return withRetry(async () => {
        await youtubeLimiter.getToken();

        let url = endpoint.startsWith('http') ? endpoint : `${config.youtube.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        return handleApiResponse(response, 'youtube');
    });
};

// --- Data Fetching ---

export const getYouTubePlaylists = async (accessToken) => {
    let allPlaylists = [];
    let pageToken = '';

    // YouTube rate limits are strict, so we limit pages here too
    const MAX_PAGES = 20;
    let pages = 0;

    do {
        const url = `/playlists?part=snippet,contentDetails&mine=true&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const data = await fetchYouTube(url, accessToken);

        if (data.items) {
            allPlaylists = [...allPlaylists, ...data.items];
        }
        pageToken = data.nextPageToken;
        pages++;
    } while (pageToken && pages < MAX_PAGES);

    return { items: allPlaylists, total: allPlaylists.length };
};

export const getPlaylistItems = async (accessToken, playlistId) => {
    // Only fetch snippet to save quota if possible, but we usually need title/artist
    let allItems = [];
    let pageToken = '';
    const MAX_PAGES = 50;
    let pages = 0;

    do {
        const url = `/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const data = await fetchYouTube(url, accessToken);

        if (data.items) {
            allItems = [...allItems, ...data.items];
        }
        pageToken = data.nextPageToken;
        pages++;
    } while (pageToken && pages < MAX_PAGES);

    // Normalize structure to similar to Spotify for easier processing later if needed
    // But keeping raw items is fine, matching layer handles mapping
    return { items: allItems, total: allItems.length };
};

export const searchYouTubeVideo = async (accessToken, query) => {
    const q = encodeURIComponent(query);
    // Searching 'video' type.
    return fetchYouTube(`/search?part=snippet&q=${q}&type=video&maxResults=1`, accessToken);
};

// --- Write Operations ---

export const createYouTubePlaylist = async (accessToken, title, description) => {
    return fetchYouTube(`/playlists?part=snippet,status`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
            snippet: {
                title,
                description
            },
            status: {
                privacyStatus: 'private'
            }
        })
    });
};

export const addVideoToPlaylist = async (accessToken, playlistId, videoId) => {
    return fetchYouTube(`/playlistItems?part=snippet`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
            snippet: {
                playlistId,
                resourceId: {
                    kind: 'youtube#video',
                    videoId
                }
            }
        })
    });
};
