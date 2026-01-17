
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLikedTracks, getPlaylistTracks, createPlaylist, addTracksToPlaylist, getCurrentUser } from '@/lib/spotify';
import { createYouTubePlaylist, addVideoToPlaylist, getPlaylistItems } from '@/lib/youtube';
import { processTransferBatch } from '@/lib/matching';
import { logError, AppError } from '@/lib/utils'; // Assuming utils are set up

// Helper to encode SSE messages
const sendEvent = (controller, event, data) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
};

export async function POST(request) {
    const body = await request.json();
    const { source, playlistIds, dest } = body;
    // const dest = source === 'spotify' ? 'youtube' : 'spotify'; // No longer inferred
    const cookieStore = await cookies();
    const sourceToken = cookieStore.get(`${source}_access_token`)?.value;
    const destToken = cookieStore.get(`${dest}_access_token`)?.value;

    if (!sourceToken || !destToken) {
        return NextResponse.json({ error: 'Not authenticated on both platforms' }, { status: 401 });
    }

    // Create a streaming response
    const stream = new ReadableStream({
        async start(controller) {
            try {
                sendEvent(controller, 'start', { message: 'Starting transfer...' });

                const summary = {
                    totalPlaylists: playlistIds.length,
                    totalTracks: 0,
                    successful: 0,
                    failed: 0,
                    playlists: []
                };

                // Get User ID for Spotify if destination
                let spotifyUserId = null;
                if (dest === 'spotify') {
                    try {
                        const user = await getCurrentUser(destToken);
                        spotifyUserId = user.id;
                    } catch (e) {
                        sendEvent(controller, 'error', { message: "Failed to get Spotify User ID" });
                        throw e;
                    }
                }

                for (const pId of playlistIds) {
                    let tracksToTransfer = [];
                    let playlistName = "";

                    sendEvent(controller, 'progress', { message: `Fetching data for playlist ID: ${pId}` });

                    // 1. Fetch Source Tracks
                    try {
                        if (source === 'spotify') {
                            if (pId === 'liked_songs') {
                                playlistName = "Liked Songs (From Spotify)";
                                const res = await getLikedTracks(sourceToken);
                                tracksToTransfer = res.items.map(t => ({
                                    name: t.track.name,
                                    artist: t.track.artists[0].name,
                                    track: t.track // Keep full obj? nah just minimal
                                }));
                            } else {
                                // We need a way to get playlist Name... assuming front-end passed it or we fetch it?
                                // For now, let's fetch playlist details or just use generic name if we only have ID
                                // Ideally, fetch playlist details first. 
                                // Simplified: "Transfer [ID]"
                                playlistName = `Transfer ${pId}`;
                                const res = await getPlaylistTracks(sourceToken, pId);
                                tracksToTransfer = res.items.map(t => ({
                                    name: t.track.name,
                                    artist: t.track.artists[0].name,
                                    track: t.track // Keep full obj including URI
                                }));
                            }
                        } else {
                            // YouTube Source
                            playlistName = `Transfer ${pId}`;
                            const res = await getPlaylistItems(sourceToken, pId);
                            tracksToTransfer = res.items.map(i => ({
                                name: i.snippet.title,
                                artist: "",
                                originalItem: i // Keep full obj including resourceId
                            }));
                        }
                    } catch (e) {
                        logError(e, `Fetching source playlist ${pId} failed`);
                        sendEvent(controller, 'log', { message: `Failed to fetch playlist ${pId}: ${e.message}`, type: 'error' });
                        continue; // Skip this playlist
                    }

                    summary.totalTracks += tracksToTransfer.length;
                    sendEvent(controller, 'progress', { message: `Found ${tracksToTransfer.length} tracks in ${playlistName}. Matching...` });

                    // 2. Match
                    let matches = [];
                    let failed = [];

                    if (source === dest) {
                        // Same Platform Optimization: SKIP Matching
                        // Direct clone.
                        matches = tracksToTransfer.map(t => {
                            if (source === 'spotify') {
                                return { match: { uri: t.track.uri } };
                            } else {
                                // YouTube: Use preserved original item
                                return { match: { id: { videoId: t.originalItem.snippet.resourceId.videoId } } };
                            }
                        }).filter(Boolean);

                        sendEvent(controller, 'log', { message: `Same platform detected. Cloning ${matches.length} tracks directly.`, type: 'info' });
                    } else {
                        // Cross Platform: Use Matching Lib
                        const result = await processTransferBatch(
                            tracksToTransfer,
                            source,
                            destToken,
                            (curr, total) => { }
                        );
                        matches = result.matches;
                        failed = result.failed;
                    }

                    if (source !== dest) { // Only log matching for cross-platform
                        sendEvent(controller, 'progress', { message: `Matched ${matches.length} songs. Creating playlist...` });
                    } else {
                        sendEvent(controller, 'progress', { message: `Cloning ${matches.length} songs. Creating duplicate playlist...` });
                    }

                    // 3. Create Dest Playlist
                    let newPlaylistId = null;
                    if (dest === 'spotify') {
                        const created = await createPlaylist(destToken, spotifyUserId, playlistName, "Transferred via MelodyTransfer");
                        newPlaylistId = created.id;

                        // 4. Add Tracks
                        if (matches.length > 0) {
                            const uris = matches.map(m => m.match.uri);
                            await addTracksToPlaylist(destToken, newPlaylistId, uris);
                        }

                    } else {
                        // YouTube Create
                        const created = await createYouTubePlaylist(destToken, playlistName, "Transferred via MelodyTransfer");
                        newPlaylistId = created.id;

                        // 4. Add Videos
                        for (const m of matches) {
                            try {
                                const videoId = m.match.id.videoId;
                                await addVideoToPlaylist(destToken, newPlaylistId, videoId);
                            } catch (e) {
                                if (e.code === 403 || e.message?.includes('quota')) {
                                    sendEvent(controller, 'error', { message: 'YouTube Quota Exceeded. Transfer paused. Please try again tomorrow.' });
                                    throw new Error("Quota Exceeded"); // Break the main loop
                                }
                                // Log other individual track failures but continue
                                logError(e, "Failed to add video to playlist");
                            }
                        }
                    }

                    sendEvent(controller, 'log', { message: `Completed ${playlistName}: ${matches.length} transferred, ${failed.length} failed.`, type: 'success' });

                    summary.playlists.push({
                        name: playlistName,
                        success: matches.length,
                        fail: failed.length
                    });
                }

                sendEvent(controller, 'complete', { summary });
            } catch (error) {
                console.error("Stream Error", error);
                const errorMsg = error.details ? `${error.message} (- ${JSON.stringify(error.details?.error?.message || 'Check logs')})` : error.message;
                sendEvent(controller, 'error', { message: errorMsg || "Transfer failed" });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
