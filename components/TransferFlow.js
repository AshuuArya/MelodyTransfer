"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TransferFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState(1);
    const [source, setSource] = useState(null);
    const [dest, setDest] = useState(null);
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylists, setSelectedPlaylists] = useState([]);
    const [authStatus, setAuthStatus] = useState({ spotify: false, youtube: false });
    const [loading, setLoading] = useState(false);

    // Transfer State
    const [progressLog, setProgressLog] = useState([]);
    const [transferStats, setTransferStats] = useState({ total: 0, successful: 0, failed: 0 });
    const [transferActive, setTransferActive] = useState(false);
    const logContainerRef = useRef(null);

    // Initial Auth Check
    useEffect(() => {
        checkAuthStatus();
    }, [searchParams]);

    const checkAuthStatus = async () => {
        try {
            const res = await fetch('/api/auth/status');
            const status = await res.json();
            setAuthStatus(status);
        } catch (e) {
            console.error("Auth check failed", e);
        }
    };

    const handleSourceSelect = (s) => {
        setSource(s);
        setDest(s === 'spotify' ? 'youtube' : 'spotify');
        setStep(2);
    };

    const handleDisconnect = async (provider) => {
        try {
            const res = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider })
            });
            if (res.ok) {
                setAuthStatus(prev => ({ ...prev, [provider]: false }));
            }
        } catch (e) {
            console.error("Disconnect failed", e);
        }
    };

    const login = (provider) => {
        // Redirect to auth endpoint
        window.location.href = `/api/auth/${provider}`;
    };

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/data/fetch?source=${source}`);
            if (res.status === 401) {
                alert("Session expired. Please reconnect.");
                checkAuthStatus();
                return;
            }

            const data = await res.json();
            if (data.playlists) {
                setPlaylists(data.playlists);
                setStep(3);
            } else {
                alert("Failed to fetch playlists: " + (data.error || "Unknown error"));
            }
        } catch (e) {
            alert("Network error fetching data");
        } finally {
            setLoading(false);
        }
    };

    const abortControllerRef = useRef(null);

    const startTransfer = async () => {
        setStep(4);
        setTransferActive(true);
        setProgressLog([]);
        setTransferStats({ total: 0, successful: 0, failed: 0 });

        // Create new AbortController
        abortControllerRef.current = new AbortController();

        const playlistIds = selectedPlaylists.map(p => p.id);

        try {
            const response = await fetch('/api/transfer/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source, playlistIds }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error("Transfer request failed");

            // Consume Streaming Response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('event:')) {
                        const eventType = line.split('\n')[0].replace('event: ', '');
                        const dataLine = line.split('\n')[1];
                        if (dataLine && dataLine.startsWith('data: ')) {
                            const data = JSON.parse(dataLine.replace('data: ', ''));
                            handleStreamEvent(eventType, data);
                        }
                    }
                }
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                addLog('Transfer Cancelled by User', 'error');
            } else {
                console.error(e);
                addLog(`Error: ${e.message}`, 'error');
            }
        } finally {
            setTransferActive(false);
            abortControllerRef.current = null;
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const handleStreamEvent = (type, data) => {
        switch (type) {
            case 'start':
                addLog(data.message);
                break;
            case 'progress':
                addLog(data.message, 'info');
                break;
            case 'log':
                addLog(data.message, data.type);
                break;
            case 'complete':
                addLog("Transfer Completed!", 'success');
                if (data.summary) {
                    setTransferStats({
                        total: data.summary.totalTracks,
                        successful: data.summary.successful,
                        failed: data.summary.failed
                    });
                }
                setTransferActive(false);
                break;
            case 'error':
                addLog(`Error: ${data.message}`, 'error');
                break;
        }
    };

    const addLog = (msg, type = 'info') => {
        setProgressLog(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
    };

    // Auto-scroll log
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [progressLog]);

    // UI Renders (Simplified from original but keeping style)

    // Step 1: Source
    if (step === 1) {
        return (
            <div className="w-full max-w-4xl mx-auto p-6">
                <h2 className="text-3xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">Select Source Platform</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button onClick={() => handleSourceSelect('spotify')} className="group p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-green-500 hover:bg-zinc-800 transition-all duration-300">
                        <span className="text-4xl block mb-4">🟢</span>
                        <span className="text-2xl font-bold text-white group-hover:text-green-400">Spotify</span>
                    </button>
                    <button onClick={() => handleSourceSelect('youtube')} className="group p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-red-500 hover:bg-zinc-800 transition-all duration-300">
                        <span className="text-4xl block mb-4">🔴</span>
                        <span className="text-2xl font-bold text-white group-hover:text-red-400">YouTube Music</span>
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: Auth
    if (step === 2) {
        return (
            <div className="w-full max-w-2xl mx-auto p-6">
                <h2 className="text-3xl font-bold text-center mb-8">Connect Accounts</h2>
                <div className="space-y-6">
                    <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-700 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold">{source === 'spotify' ? 'Spotify' : 'YouTube'} (Source)</h3>
                            <p className="text-sm text-zinc-400">{authStatus[source] ? 'Connected' : 'Not Connected'}</p>
                        </div>
                        <div className="flex gap-2">
                            {authStatus[source] && (
                                <button onClick={() => handleDisconnect(source)} className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition" title="Disconnect">
                                    ✕
                                </button>
                            )}
                            <button onClick={() => login(source)} disabled={authStatus[source]} className={`px-6 py-2 rounded-full font-bold transition ${authStatus[source] ? 'bg-green-500/20 text-green-500 cursor-default' : 'bg-white text-black hover:bg-zinc-200'}`}>
                                {authStatus[source] ? '✓ Connected' : 'Connect'}
                            </button>
                        </div>
                    </div>
                    <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-700 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold">{dest === 'spotify' ? 'Spotify' : 'YouTube'} (Destination)</h3>
                            <p className="text-sm text-zinc-400">{authStatus[dest] ? 'Connected' : 'Not Connected'}</p>
                        </div>
                        <div className="flex gap-2">
                            {authStatus[dest] && (
                                <button onClick={() => handleDisconnect(dest)} className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition" title="Disconnect">
                                    ✕
                                </button>
                            )}
                            <button onClick={() => login(dest)} disabled={authStatus[dest]} className={`px-6 py-2 rounded-full font-bold transition ${authStatus[dest] ? 'bg-green-500/20 text-green-500 cursor-default' : 'bg-white text-black hover:bg-zinc-200'}`}>
                                {authStatus[dest] ? '✓ Connected' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-10">
                    <button onClick={fetchPlaylists} disabled={loading || !authStatus[source] || !authStatus[dest]} className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-500 transition">
                        {loading ? 'Loading...' : 'Next: Select Music'}
                    </button>
                </div>
            </div>
        );
    }

    // Step 3: Select
    if (step === 3) {
        return (
            <div className="w-full max-w-4xl mx-auto p-6">
                <h2 className="text-3xl font-bold mb-6">Select Playlists</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-h-[500px] overflow-y-auto">
                    {playlists.map(p => (
                        <div key={p.id} onClick={() => {
                            if (selectedPlaylists.includes(p)) setSelectedPlaylists(prev => prev.filter(x => x !== p));
                            else setSelectedPlaylists(prev => [...prev, p]);
                        }} className={`cursor-pointer p-4 rounded-xl border transition-all ${selectedPlaylists.includes(p) ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
                            {p.image && <img src={p.image} className="w-12 h-12 rounded mb-2 object-cover" />}
                            <h3 className="font-bold truncate">{p.name}</h3>
                            <p className="text-xs text-zinc-400">{p.trackCount} tracks</p>
                        </div>
                    ))}
                </div>
                <div className="text-center">
                    <button onClick={startTransfer} disabled={selectedPlaylists.length === 0} className="px-10 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl hover:scale-105 transition shadow-lg border border-transparent hover:border-green-400">
                        Start Transfer ({selectedPlaylists.length})
                    </button>
                </div>
            </div>
        );
    }

    // Step 4: Progress
    if (step === 4) {
        const percent = transferStats.total > 0 ? Math.round((transferStats.successful + transferStats.failed) / transferStats.total * 100) : 0;

        return (
            <div className="w-full max-w-3xl mx-auto p-6">
                <h2 className="text-3xl font-bold text-center mb-2">{transferActive ? 'Transferring Logic...' : 'Transfer Complete'}</h2>

                {transferActive && (
                    <div className="text-center mb-6">
                        <button onClick={handleCancel} className="px-6 py-2 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition font-bold text-sm">
                            Stop Transfer
                        </button>
                    </div>
                )}

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                        <p className="text-zinc-400 text-sm">Total Tracks</p>
                        <p className="text-2xl font-bold">{transferStats.total || '-'}</p>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-xl border border-green-900/30">
                        <p className="text-green-400 text-sm">Successful</p>
                        <p className="text-2xl font-bold text-green-500">{transferStats.successful}</p>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-xl border border-red-900/30">
                        <p className="text-red-400 text-sm">Failed</p>
                        <p className="text-2xl font-bold text-red-500">{transferStats.failed}</p>
                    </div>
                </div>

                {/* Log Terminal */}
                <div ref={logContainerRef} className="bg-black/80 p-6 rounded-xl border border-zinc-800 font-mono text-sm h-[400px] overflow-y-auto mb-6 shadow-inner">
                    {progressLog.map((log, i) => (
                        <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400 font-bold' : 'text-zinc-300'}`}>
                            <span className="text-zinc-600">[{log.time}]</span> {log.msg}
                        </div>
                    ))}
                    {!transferActive && <div className="text-blue-400 mt-4">--- End of Transfer ---</div>}
                </div>

                {!transferActive && (
                    <div className="text-center">
                        <button onClick={() => window.location.reload()} className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition">
                            Start New Transfer
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return null;
}
