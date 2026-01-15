/**
 * MelodyTransfer Configuration
 * Centralized access to environment variables and constants.
 */

const getEnv = (key, required = false) => {
    const value = process.env[key];
    if (required && !value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const config = {
    spotify: {
        clientId: getEnv('SPOTIFY_CLIENT_ID', false), // Optional in build, required in runtime
        clientSecret: getEnv('SPOTIFY_CLIENT_SECRET', false),
        redirectUri: getEnv('SPOTIFY_REDIRECT_URI', false),
        authUrl: 'https://accounts.spotify.com/authorize',
        tokenUrl: 'https://accounts.spotify.com/api/token',
        baseUrl: 'https://api.spotify.com/v1',
    },
    youtube: {
        clientId: getEnv('YOUTUBE_CLIENT_ID', false),
        clientSecret: getEnv('YOUTUBE_CLIENT_SECRET', false),
        redirectUri: getEnv('YOUTUBE_REDIRECT_URI', false),
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        baseUrl: 'https://www.googleapis.com/youtube/v3',
    },
    app: {
        baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        isDev: process.env.NODE_ENV === 'development',
    },
    transfer: {
        defaultBatchSize: 10,
        maxRetries: 3,
        retryDelay: 1000,
    }
};
