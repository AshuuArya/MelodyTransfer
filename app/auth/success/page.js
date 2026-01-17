'use client';
import { useEffect } from 'react';

export default function AuthSuccess() {
    useEffect(() => {
        if (window.opener) {
            window.opener.postMessage({ type: 'AUTH_COMPLETE' }, window.location.origin);
            window.close();
        } else {
            // Fallback if not in popup
            window.location.href = '/';
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-white font-sans">
            <div className="animate-spin text-4xl mb-4">🔄</div>
            <p className="text-zinc-400">Authentication successful. Closing...</p>
        </div>
    );
}
