# API Setup Guide for MelodyTransfer

This guide details how to obtain the necessary API credentials for Spotify and YouTube Music (Google Data API).

## 1. Spotify Web API

**Goal**: Get `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.

1.  **Log in** to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
2.  Click **Create App**.
    -   **App Name**: MelodyTransfer (or your choice).
    -   **App Description**: Bidirectional music transfer.
    -   **Redirect URIs**: 
        -   `http://localhost:3000/api/auth/spotify`
        -   *(If deploying)* `https://your-domain.com/api/auth/spotify`
    -   **Which API/SDKs are you planning to use?**: Select "Web API".
3.  Click **Save**.
4.  On the App Overview page, click **Settings**.
5.  Copy the **Client ID**.
6.  Click "View client secret" and copy the **Client Secret**.
7.  Add these to your `.env` file.

## 2. YouTube Data API (Google Cloud)

**Goal**: Get `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`.

1.  **Log in** to the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Create a New Project** (or select an existing one):
    -   Click the project dropdown in the top bar -> "New Project".
    -   Name it "MelodyTransfer".
3.  **Enable the API**:
    -   Go to **APIs & Services** -> **Library**.
    -   Search for "YouTube Data API v3".
    -   Click **Enable**.
4.  **Configure OAuth Consent Screen**:
    -   Go to **APIs & Services** -> **OAuth consent screen**.
    -   Select **External** (unless you have a Google Workspace organization).
    -   Fill in required fields (App name, User support email, Developer contact email).
    -   **Scopes**: Add the following scopes:
        -   `.../auth/youtube` (Manage your YouTube account)
        -   `.../auth/youtube.force-ssl` (See, edit, and permanently delete your YouTube videos, ratings, comments and captions)
        -   `.../auth/youtube.readonly` (View your YouTube account)
    -   **Test Users**: Add your own email address (important while in "Testing" mode).
5.  **Create Credentials**:
    -   Go to **APIs & Services** -> **Credentials**.
    -   Click **Create Credentials** -> **OAuth client ID**.
    -   **Application type**: Web application.
    -   **Name**: MelodyTransfer Web Client.
    -   **Authorized JavaScript origins**: `http://localhost:3000`
    -   **Authorized redirect URIs**: `http://localhost:3000/api/auth/youtube`
    -   Click **Create**.
6.  Copy the **Client ID** and **Client Secret**.
7.  Add these to your `.env` file.

## 3. Environment Configuration

Ensure your `.env` (or `.env.local`) file looks like this:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify

YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube
```

## 4. Code References

-   **Variable Loading**: See `lib/config.js` for how these variables are loaded and validated.
-   **Auth Implementation**: See `app/api/auth/[provider]/route.js`. The same route handles both the initial redirect (GET with no code) and the callback (GET with code).

For any future agents working on this:
-   **Do not change the Redirect URIs** structure in the code without updating the specific provider dashboards.
-   **Scopes** are defined in `lib/spotify.js` and `lib/youtube.js` respectively. If you add features requiring more permissions (e.g. modifying playlists), update the scopes there and potentially re-authenticate users.
