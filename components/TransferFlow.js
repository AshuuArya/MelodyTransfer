"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TransferFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Steps: 1: Source, 2: Dest, 3: Auth, 4: Select, 5: Transfer
    const [step, setStep] = useState(1);

    const [source, setSource] = useState(null); // 'spotify' | 'youtube'
    const [dest, setDest] = useState(null);     // 'spotify' | 'youtube'

    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylists, setSelectedPlaylists] = useState([]);
    const [authStatus, setAuthStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    // Transfer State
    const [progressLog, setProgressLog] = useState([]);
    const [transferStats, setTransferStats] = useState({ total: 0, successful: 0, failed: 0 });
    const [transferActive, setTransferActive] = useState(false);
    const logContainerRef = useRef(null);

    // Initial Auth Check with Polling
    useEffect(() => {
        checkAuthStatus();
        const interval = setInterval(checkAuthStatus, 2000);
        setTimeout(() => clearInterval(interval), 15000);
        return () => clearInterval(interval);
    }, [searchParams]);

    // Listen for Popup Auth Success
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'AUTH_COMPLETE') {
                checkAuthStatus();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const checkAuthStatus = async () => {
        try {
            const res = await fetch('/api/auth/status');
            const status = await res.json();
            setAuthStatus(status);
        } catch (e) {
            console.error("Auth check failed", e);
        }
    };

    const handleDisconnect = async (provider, role) => {
        // We need a logout API that accepts role
        // For now, assume logout clears all or we add logic? 
        // Let's just create a logout endpoint or client-side cookie clear?
        // Simple hack: Call logout endpoint with role param
        try {
            // NOTE: You need to implement /api/auth/logout handler to accept role if you haven't!
            // Assuming we'll fix backend logout next
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, role })
            });
            checkAuthStatus();
        } catch (e) {
            console.error("Disconnect failed", e);
        }
    };

    const login = (provider, role) => {
        const width = 500;
        const height = 600;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        window.open(
            `/api/auth/${provider}?role=${role}`,
            'MelodyTransferAuth',
            `width=${width},height=${height},top=${top},left=${left},status=0,menubar=0`
        );
    };

    const handleSwap = () => {
        const tempSource = source;
        const tempDest = dest;
        setSource(tempDest);
        setDest(tempSource);
    };

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            // Fetch needs to know it's a 'source' fetch
            const res = await fetch(`/api/data/fetch?source=${source}&role=source`); // Add role param to fetch

            if (res.status === 401) {
                alert("Session expired. Please reconnect.");
                checkAuthStatus();
                return;
            }

            const data = await res.json();
            if (data.playlists) {
                setPlaylists(data.playlists);
                setStep(4);
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
        setStep(5);
        setTransferActive(true);
        setProgressLog([]);
        setTransferStats({ total: 0, successful: 0, failed: 0 });

        abortControllerRef.current = new AbortController();
        const playlistIds = selectedPlaylists.map(p => p.id);

        try {
            const response = await fetch('/api/transfer/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source, dest, playlistIds }), // Send dest too!
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error("Transfer request failed");

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
        if (abortControllerRef.current) abortControllerRef.current.abort();
    };

    const handleStreamEvent = (type, data) => {
        switch (type) {
            case 'start': addLog(data.message); break;
            case 'progress': addLog(data.message, 'info'); break;
            case 'log': addLog(data.message, data.type); break;
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
            case 'error': addLog(`Error: ${data.message}`, 'error'); break;
        }
    };

    const addLog = (msg, type = 'info') => {
        setProgressLog(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
    };

    useEffect(() => {
        if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }, [progressLog]);

    // --- UI HELPERS ---
    const getAuthData = (provider, role) => {
        if (!authStatus) return null;
        return authStatus[provider]?.[role];
    };

    const renderAuthCard = (role, provider) => {
        const data = getAuthData(provider, role);
        const isConnected = data?.connected;
        const user = data?.user;
        const color = provider === 'spotify' ? 'green' : 'red';
        const borderColor = provider === 'spotify' ? 'border-green-500' : 'border-red-500';

        let avatar = 'https://www.gravatar.com/avatar?d=mp';
        let name = 'Unknown User';

        if (user) {
            if (provider === 'spotify') {
                avatar = user.images?.[0]?.url || avatar;
                name = user.display_name;
            } else {
                avatar = user.thumbnails?.default?.url || avatar;
                name = user.title;
            }
        }

        return (
            <div className={`p-6 rounded-xl bg-zinc-900 border border-zinc-700 flex flex-col md:flex-row justify-between items-center gap-4 group hover:border-zinc-600 transition-all ${role === 'source' ? 'md:mr-auto' : 'md:ml-auto'} w-full`}>
                <div className="flex items-center gap-4 w-full">
                    {isConnected ? (
                        <img
                            src={avatar}
                            className={`w-12 h-12 rounded-full border-2 ${borderColor} object-cover`}
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://www.gravatar.com/avatar?d=mp'; }}
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
                            {provider === 'spotify' ? '🟢' : '🔴'}
                        </div>
                    )}
                    <div>
                        <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">{role}</div>
                        <h3 className="text-xl font-bold capitalize">{provider === 'youtube' ? 'YouTube Music' : provider}</h3>
                        {isConnected ? (
                            <p className={`text-sm text-${color}-400 font-medium`}>{name}</p>
                        ) : (
                            <p className="text-sm text-zinc-400">Not Connected</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <button onClick={() => handleDisconnect(provider, role)} className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition" title="Disconnect">
                            ✕
                        </button>
                    ) : (
                        <button onClick={() => login(provider, role)} className="px-6 py-2 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition whitespace-nowrap">
                            Connect
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // --- RENDER ---

    if (step === 1) {
        return (
            <div className="w-full max-w-4xl mx-auto p-6">
                <h2 className="text-3xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">Select Source Platform</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button onClick={() => { setSource('spotify'); setStep(2); }} className="group p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-green-500 hover:bg-zinc-800 transition-all">
                        <span className="text-4xl block mb-4">🟢</span>
                        <span className="text-2xl font-bold text-white group-hover:text-green-400">Spotify</span>
                    </button>
                    <button onClick={() => { setSource('youtube'); setStep(2); }} className="group p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-red-500 hover:bg-zinc-800 transition-all">
                        <span className="text-4xl block mb-4">🔴</span>
                        <span className="text-2xl font-bold text-white group-hover:text-red-400">YouTube Music</span>
                    </button>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="w-full max-w-4xl mx-auto p-6">
                <div className="flex items-center mb-10 relative">
                    <button onClick={() => setStep(1)} className="absolute left-0 p-2 text-zinc-400 hover:text-white"><span className="text-xl">←</span></button>
                    <h2 className="text-3xl font-bold text-center w-full bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">Select Destination</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button onClick={() => { setDest('spotify'); setStep(3); }} className="group p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-green-500 hover:bg-zinc-800 transition-all">
                        <span className="text-4xl block mb-4">🟢</span>
                        <span className="text-2xl font-bold text-white group-hover:text-green-400">Spotify</span>
                    </button>
                    <button onClick={() => { setDest('youtube'); setStep(3); }} className="group p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-red-500 hover:bg-zinc-800 transition-all">
                        <span className="text-4xl block mb-4">🔴</span>
                        <span className="text-2xl font-bold text-white group-hover:text-red-400">YouTube Music</span>
                    </button>
                </div>
            </div>
        );
    }

    if (step === 3) {
        const sourceConnected = getAuthData(source, 'source')?.connected;
        const destConnected = getAuthData(dest, 'dest')?.connected;
        const canProceed = sourceConnected && destConnected;

        return (
            <div className="w-full max-w-3xl mx-auto p-6">
                <div className="flex items-center mb-8 relative">
                    <button onClick={() => setStep(2)} className="absolute left-0 p-2 text-zinc-400 hover:text-white"><span className="text-xl">←</span></button>
                    <h2 className="text-3xl font-bold text-center w-full">Connect Accounts</h2>
                </div>

                <div className="space-y-6">
                    {renderAuthCard('source', source)}

                    <div className="flex justify-center relative">
                        <div className="absolute inset-x-0 top-1/2 border-t border-zinc-800 -z-10"></div>
                        <button
                            onClick={handleSwap}
                            className="p-3 rounded-full bg-zinc-900 border border-zinc-700 hover:border-blue-500 hover:text-blue-500 transition-all shadow-xl group"
                            title="Swap Source and Destination"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500"><path d="M7 10v12" /><path d="M15 10.5 7 3 3 8" /><path d="M21 3v12" /><path d="M9 11l-4 9-4-5" /></svg>
                            <span className="sr-only">Swap</span>
                        </button>
                    </div>

                    {renderAuthCard('dest', dest)}
                </div>

                <div className="text-center mt-10">
                    <button onClick={fetchPlaylists} disabled={loading || !canProceed} className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-500 transition shadow-lg hover:shadow-blue-500/20">
                        {loading ? 'Loading...' : 'Next: Select Music'}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 4) { // Select Music
        return (
            <div className="w-full max-w-4xl mx-auto p-6">
                <div className="flex items-center mb-6 relative">
                    <button onClick={() => setStep(3)} className="absolute left-0 p-2 text-zinc-400 hover:text-white"><span className="text-xl">←</span></button>
                    <h2 className="text-3xl font-bold w-full text-center">Select Playlists</h2>
                </div>
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

    if (step === 5) { // Progress
        const percent = transferStats.total > 0 ? Math.round((transferStats.successful + transferStats.failed) / transferStats.total * 100) : 0;
        return (
            <div className="w-full max-w-3xl mx-auto p-6">
                <h2 className="text-3xl font-bold text-center mb-2">{transferActive ? 'Transferring...' : 'Transfer Complete'}</h2>

                {transferActive && (
                    <div className="text-center mb-6">
                        <button onClick={handleCancel} className="px-6 py-2 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition font-bold text-sm">
                            Stop Transfer
                        </button>
                    </div>
                )}

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
