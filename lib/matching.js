import { searchTrack } from './spotify';
import { searchYouTubeVideo } from './youtube';
import { logError } from './utils';

// Calculate Levenshtein distance for string similarity
const levenshtein = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

const getSimilarity = (s1, s2) => {
    const longer = s1.length > s2.length ? s1 : s2;
    if (longer.length === 0) return 1.0;
    return (longer.length - levenshtein(s1, s2)) / longer.length;
};

// Clean strings for better matching
const cleanString = (str) => {
    return str.toLowerCase()
        .replace(/[\-\(\)\[\]\{\}]/g, "") // Remove brackets
        .replace(/\b(feat|ft|official|audio|video|lyrics)\b/g, "") // Remove common keywords
        .replace(/\s+/g, " ")
        .trim();
};

export const findMatchOnSpotify = async (trackName, artistName, accessToken) => {
    try {
        const query = `${artistName} ${trackName}`;
        const results = await searchTrack(accessToken, query);

        if (results.tracks && results.tracks.items.length > 0) {
            const match = results.tracks.items[0];

            // Validate Match
            const matchName = cleanString(match.name);
            const originalName = cleanString(trackName);
            const score = getSimilarity(matchName, originalName);

            // Simple threshold
            if (score > 0.4 || cleanString(match.artists[0].name).includes(cleanString(artistName))) {
                return { ...match, confidence: score };
            }
            // Allow loose matches if artist is somewhat correct
            return { ...match, confidence: score, warning: 'Low confidence' };
        }
    } catch (e) {
        logError(e, `Spotify Search Failed: ${trackName}`);
    }
    return null;
};

export const findMatchOnYouTube = async (trackName, artistName, accessToken) => {
    try {
        const query = `${artistName} - ${trackName}`;
        const results = await searchYouTubeVideo(accessToken, query);

        if (results.items && results.items.length > 0) {
            const match = results.items[0];
            const title = cleanString(match.snippet.title);
            const original = cleanString(query);
            const score = getSimilarity(title, original);

            return { ...match, confidence: score };
        }
    } catch (e) {
        logError(e, `YouTube Search Failed: ${trackName}`);
    }
    return null;
};

export const processTransferBatch = async (items, source, destToken, onProgress) => {
    const matches = [];
    const failed = [];
    let completed = 0;

    // Process in parallel with concurrency limit could be better, but loop is safer for simple rate limits
    for (const item of items) {
        let match = null;
        try {
            if (source === 'spotify') {
                // Source is Spotify, Dest is YT
                // Item is from Spotify
                const name = item.track ? item.track.name : item.name;
                const artist = item.track ? item.track.artists[0].name : item.artist;

                if (!name || !artist) {
                    throw new Error("Invalid track data");
                }

                match = await findMatchOnYouTube(name, artist, destToken);
            } else {
                // Source is YT, Dest is Spotify
                // Item is from YT (snippet)
                const title = item.snippet ? item.snippet.title : item.name;
                // Parse Artist - Title from YT title if possible, or just send whole title
                // Simple heuristic: default whole title
                let name = title;
                let artist = "";

                // Try to split "Artist - Title"
                if (title.includes("-")) {
                    const parts = title.split("-");
                    artist = parts[0].trim();
                    name = parts.slice(1).join("-").trim();
                }

                match = await findMatchOnSpotify(name, artist, destToken);
            }

            if (match) {
                matches.push({ original: item, match });
            } else {
                failed.push(item);
            }
        } catch (e) {
            failed.push({ item, error: e.message });
        }

        completed++;
        if (onProgress) onProgress(completed, items.length);
    }
    return { matches, failed };
};
