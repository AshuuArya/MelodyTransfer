# YouTube API Quota Usage Guide

You encountered a `Quota Exceeded` error. This is a standard limitation of the free YouTube Data API.

## The Math (Why it failed)

Google gives you **10,000 units per day** for free.

-   **Searching for a song** (`search.list`): **100 units** / request.
-   **Creating a playlist**: **50 units**.
-   **Adding a song to playlist**: **50 units**.

### Cost of Transferring 1 Playlist (50 Songs):
1.  **Search**: 50 songs × 100 units = **5,000 units**
2.  **Add**: 50 songs × 50 units = **2,500 units**
3.  **Create**: 1 × 50 units = **50 units**
4.  **Total**: **7,550 units**

**Result**: You can only transfer about **60-70 songs per day** before hitting the 10,000 limit.

## Solutions

### 1. Request a Quota Increase (Recommended for Production)
If you want this to be a real app used by others, you **must** apply for a quota audit.
-   Go to Google Cloud Console > IAM & Admin > Quotas.
-   Find "YouTube Data API v3".
-   Request a higher limit.

### 2. Use Multiple API Keys (For Testing)
-   Create a **new** Google Cloud Project.
-   Enable YouTube Data API.
-   Get new Client ID / Secret.
-   Update your `.env` (and Vercel).
-   This gives you a fresh 10,000 units for the day.

### 3. Wait
-   The quota resets at **midnight Pacific Time (PT)**.

## Code Optimization?
Unfortunately, searching for a video by title (`search.list`) is the most expensive operation (100 units) and is required to match Spotify songs to YouTube videos. There is no legitimate "cheaper" way in the official API.
