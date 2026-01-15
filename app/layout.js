import { Outfit } from 'next/font/google'
import './globals.css'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata = {
    title: 'MelodyTransfer - Transfer Music Between Platforms',
    description: 'Seamlessly transfer your playlists and liked songs between Spotify and YouTube Music.',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="dark">
            <body className={`${outfit.className} antialiased min-h-screen relative overflow-x-hidden`}>
                <AnimatedBackground />
                <div className="relative z-10">
                    {children}
                </div>
            </body>
        </html>
    )
}
