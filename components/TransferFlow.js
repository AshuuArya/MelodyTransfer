"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, ChevronRight, Loader2, Music2, ArrowRight, ExternalLink, LogOut, User } from 'lucide-react';

// Animation variants
const slideUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
};

export default function TransferFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState(1);
    const [source, setSource] = useState(null); // 'spotify' | 'youtube'
    const [dest, setDest] = useState(null);
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylists, setSelectedPlaylists] = useState([]);

    // Auth State with mock user details
    const [connectionState, setConnectionState] = useState({
        spotify: { connected: false, user: null },
        youtube: { connected: false, user: null }
    });

    const [loading, setLoading] = useState(false);
    const [progressLog, setProgressLog] = useState([]);

    // Check connection status
    useEffect(() => {
        const connected = searchParams.get('connected');
        if (connected) {
            // Mock user update upon "callback"
            setConnectionState(prev => ({
                ...prev,
                [connected]: {
                    connected: true,
                    user: {
                        name: connected === 'spotify' ? 'AshuuArya' : 'Ashu Channel',
                        email: connected === 'spotify' ? 'ashu@example.com' : 'ashu@youtube.com',
                        avatar: connected === 'spotify' ? 'https://i.scdn.co/image/ab6775700000ee8555c25988a6ac314394d3fbf5' : null
                    }
                }
            }));
        }
    }, [searchParams]);

    const handleSourceSelect = (s) => {
        setSource(s);
        setDest(s === 'spotify' ? 'youtube' : 'spotify');
        setStep(2);
    };

    const login = (provider) => {
        // Mock login simulation
        setLoading(true);
        setTimeout(() => {
            setConnectionState(prev => ({
                ...prev,
                [provider]: {
                    connected: true,
                    user: {
                        name: provider === 'spotify' ? 'AshuuArya' : 'Ashu Channel',
                        email: provider === 'spotify' ? 'ashu@example.com' : 'ashu@youtube.com',
                        // Mock avatar for demo
                        avatar: provider === 'spotify' ? 'https://avatars.githubusercontent.com/u/1?v=4' : 'https://avatars.githubusercontent.com/u/2?v=4'
                    }
                }
            }));
            setLoading(false);
        }, 800);
    };

    const logout = (provider) => {
        setConnectionState(prev => ({
            ...prev,
            [provider]: { connected: false, user: null }
        }));
    };

    const fetchPlaylists = async () => {
        setLoading(true);
        // Mock Data
        setTimeout(() => {
            setPlaylists([
                { id: '1', name: 'My Top Hits 2023', trackCount: 50, image: 'https://misc.scdn.co/liked-songs/liked-songs-640.png' },
                { id: '2', name: 'Chill Vibes', trackCount: 120, image: null },
                { id: '3', name: 'Workout Pump', trackCount: 45, image: null },
                { id: '4', name: 'Coding Focus', trackCount: 200, image: null },
                { id: '5', name: 'Road Trip', trackCount: 88, image: null },
            ]);
            setLoading(false);
            setStep(3);
        }, 1500);
    };

    const startTransfer = async () => {
        setStep(4);
        await addLog(`Initializing transfer from ${source} to ${dest}...`, 500);
        await addLog("Authenticating sessions...", 800);
        await addLog(`Found ${selectedPlaylists.length} playlists to transfer.`, 500);

        for (const p of selectedPlaylists) {
            await addLog(` Creating playlist "${p.name}" on ${dest}...`, 1000);
            await addLog(` Transferring ${p.trackCount} tracks...`, 1500);
            await addLog(` Success: "${p.name}" transferred.`, 500);
        }
        await addLog("All transfers completed successfully!", 0);
    };

    const addLog = (msg, delay) => {
        return new Promise(resolve => {
            setTimeout(() => {
                setProgressLog(prev => [...prev, msg]);
                resolve();
            }, delay);
        });
    }

    const openPlatform = (provider) => {
        const url = provider === 'spotify' ? 'https://open.spotify.com' : 'https://music.youtube.com';
        window.open(url, '_blank');
    };

    return (
        <div className="w-full relative min-h-[500px]">
            <AnimatePresence mode="wait">

                {/* Step 1: Source Selection */}
                {step === 1 && (
                    <motion.div key="step1" {...slideUp} className="w-full">
                        <Card className="p-8 backdrop-blur-2xl">
                            <h2 className="text-2xl font-bold text-center mb-8">Select Source</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <PlatformButton
                                    name="Spotify"
                                    icon="spotify"
                                    onClick={() => handleSourceSelect('spotify')}
                                />
                                <PlatformButton
                                    name="YouTube Music"
                                    icon="youtube"
                                    onClick={() => handleSourceSelect('youtube')}
                                    variant="youtube"
                                />
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Step 2: Connection */}
                {step === 2 && (
                    <motion.div key="step2" {...slideUp} className="w-full">
                        <Card className="p-8">
                            <h2 className="text-2xl font-bold text-center mb-8">Connect Accounts</h2>

                            <div className="space-y-4 mb-8">
                                <ConnectionRow
                                    provider={source}
                                    role="Source"
                                    data={connectionState[source]}
                                    onConnect={() => login(source)}
                                    onLogout={() => logout(source)}
                                    onOpen={() => openPlatform(source)}
                                />
                                <div className="flex justify-center -my-2 relative z-10">
                                    <div className="bg-neutral-800 rounded-full p-1">
                                        <ArrowRight className="w-4 h-4 text-neutral-400" />
                                    </div>
                                </div>
                                <ConnectionRow
                                    provider={dest}
                                    role="Destination"
                                    data={connectionState[dest]}
                                    onConnect={() => login(dest)}
                                    onLogout={() => logout(dest)}
                                    onOpen={() => openPlatform(dest)}
                                />
                            </div>

                            <Button
                                onClick={fetchPlaylists}
                                className="w-full text-lg h-12"
                                isLoading={loading}
                                disabled={!connectionState[source].connected || !connectionState[dest].connected}
                            >
                                Continue to Selection
                            </Button>
                        </Card>
                    </motion.div>
                )}

                {/* Step 3: Playlist Selection */}
                {step === 3 && (
                    <motion.div key="step3" {...slideUp} className="w-full max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Select Playlists</h2>
                            <span className="text-neutral-400 text-sm">{selectedPlaylists.length} selected</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {playlists.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        if (selectedPlaylists.includes(p)) setSelectedPlaylists(prev => prev.filter(x => x !== p));
                                        else setSelectedPlaylists(prev => [...prev, p]);
                                    }}
                                    className={`
                                        cursor-pointer p-3 rounded-lg border transition-all flex items-center gap-4
                                        ${selectedPlaylists.includes(p)
                                            ? 'border-green-500/50 bg-green-500/10'
                                            : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'}
                                    `}
                                >
                                    <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center shrink-0">
                                        {p.image ? (
                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded" />
                                        ) : (
                                            <Music2 className="w-5 h-5 text-neutral-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium truncate">{p.name}</h4>
                                        <p className="text-xs text-neutral-400">{p.trackCount} tracks</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedPlaylists.includes(p) ? 'bg-green-500 border-green-500' : 'border-neutral-600'}`}>
                                        {selectedPlaylists.includes(p) && <Check className="w-3 h-3 text-black" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={startTransfer}
                            disabled={selectedPlaylists.length === 0}
                            className="w-full h-12 text-lg"
                        >
                            Start Transfer
                        </Button>
                    </motion.div>
                )}

                {/* Step 4: Progress */}
                {step === 4 && (
                    <motion.div key="step4" {...slideUp} className="w-full">
                        <Card className="p-8">
                            <div className="flex flex-col items-center mb-8">
                                <div className="w-16 h-16 rounded-full border-4 border-t-green-500 border-white/10 animate-spin mb-4" />
                                <h2 className="text-2xl font-bold animate-pulse">Transferring...</h2>
                            </div>

                            <div className="bg-black/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm border border-white/5">
                                {progressLog.map((log, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={i}
                                        className="mb-2 text-green-400/80"
                                    >
                                        <span className="text-neutral-600 mr-2">
                                            {new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                        </span>
                                        {log}
                                    </motion.div>
                                ))}
                                <div ref={el => el?.scrollIntoView({ behavior: 'smooth' })} />
                            </div>
                        </Card>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}

function PlatformButton({ name, icon, onClick, variant = 'spotify' }) {
    const isSpotify = variant === 'spotify';
    return (
        <button
            onClick={onClick}
            className={`
                relative group flex flex-col items-center justify-center p-8 rounded-2xl border transition-all duration-300
                ${isSpotify
                    ? 'bg-[#1DB954]/10 border-[#1DB954]/20 hover:bg-[#1DB954]/20 hover:border-[#1DB954] hover:shadow-[0_0_30px_rgba(29,185,84,0.2)]'
                    : 'bg-[#FF0000]/10 border-[#FF0000]/20 hover:bg-[#FF0000]/20 hover:border-[#FF0000] hover:shadow-[0_0_30px_rgba(255,0,0,0.2)]'
                }
            `}
        >
            <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {isSpotify ? '🟢' : '🔴'}
            </div>
            <span className="text-xl font-bold text-white max-w-[80%] text-center">
                {name}
            </span>
        </button>
    )
}

function ConnectionRow({ provider, role, data, onConnect, onLogout, onOpen }) {
    const { connected, user } = data;

    return (
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${connected ? 'bg-transparent' : 'bg-neutral-800'}`}>
                    {connected && user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-neutral-600'}`} />
                    )}
                </div>

                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium capitalize">{provider}</h3>
                        {connected && (
                            <button onClick={onOpen} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded" title={`Open ${provider}`}>
                                <ExternalLink className="w-3 h-3 text-neutral-400 hover:text-white" />
                            </button>
                        )}
                    </div>

                    {connected && user ? (
                        <p className="text-sm text-green-400 font-medium flex items-center gap-1.5">
                            {user.name}
                        </p>
                    ) : (
                        <p className="text-xs text-neutral-500">{role}</p>
                    )}
                </div>
            </div>

            {connected ? (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={onLogout} title="Disconnect">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <Button size="sm" variant="secondary" onClick={onConnect}>
                    Connect
                </Button>
            )}
        </div>
    )
}
