"use client";
import { Suspense } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import React from 'react';
import TransferFlow from '@/components/TransferFlow';
import { ArrowRight, Music, Repeat, ShieldCheck, Zap, HelpCircle } from 'lucide-react';
import HeroScene from '@/components/3d/HeroScene';
import { motion } from 'framer-motion';

export default function Home() {
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <main className="flex flex-col items-center min-h-screen px-4 py-20 md:px-24 relative overflow-hidden text-neutral-200">

            {/* 3D Background */}
            <HeroScene />

            {/* Background Gradients (Subtle overlay) */}
            <div className="fixed inset-0 z-[-1] pointer-events-none opacity-30">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[100px]" />
            </div>

            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl bg-black/40 border-b border-white/5 transition-all">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-red-600 flex items-center justify-center shadow-lg">
                        <Repeat className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white">MelodyTransfer</span>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="hidden md:flex text-neutral-400 hover:text-white" onClick={() => scrollToSection('features')}>How it works</Button>
                    <Button variant="ghost" size="sm" className="hidden md:flex text-neutral-400 hover:text-white" onClick={() => scrollToSection('faq')}>FAQ</Button>
                    <Button variant="secondary" size="sm" className="bg-white text-black hover:bg-gray-200" onClick={() => scrollToSection('transfer-tool')}>Transfer</Button>
                </div>
            </nav>

            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className="flex flex-col items-center text-center max-w-4xl mt-20 mb-24 space-y-8 relative z-10"
            >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-neutral-300 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Now supporting high-quality transfers
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 pb-2">
                    Your Music, <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-red-500">Boundless.</span>
                </h1>

                <p className="text-lg md:text-xl text-neutral-400 max-w-2xl leading-relaxed">
                    The premium bridge between <span className="text-green-500 font-semibold">Spotify</span> and <span className="text-red-500 font-semibold">YouTube Music</span>.
                    Transfer playlists, liked songs, and albums with zero friction.
                </p>

                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-wrap items-center justify-center gap-4"
                >
                    <Button size="lg" className="rounded-full bg-white text-black hover:bg-gray-200 font-bold px-8 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-shadow hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]" onClick={() => scrollToSection('transfer-tool')}>
                        Start Transfer <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button variant="secondary" size="lg" className="rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md" onClick={() => scrollToSection('features')}>
                        View Features
                    </Button>
                </motion.div>
            </motion.div>

            {/* Main Widget */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                id="transfer-tool"
                className="w-full max-w-3xl z-10 mb-32 scroll-mt-32"
            >
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-1 md:p-6 rounded-3xl shadow-2xl">
                    <React.Suspense fallback={<div className="text-white text-center py-20">Loading Transfer Tool...</div>}>
                        <TransferFlow />
                    </React.Suspense>
                </div>
            </motion.div>

            {/* Features Grid */}
            <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full mb-32 scroll-mt-32">
                <FeatureCard
                    icon={<Zap className="w-6 h-6 text-yellow-400" />}
                    title="Lightning Fast"
                    description="Transfer thousands of songs in minutes using our optimized batch processing engine."
                    delay={0}
                />
                <FeatureCard
                    icon={<ShieldCheck className="w-6 h-6 text-blue-400" />}
                    title="Secure & Private"
                    description="We use official APIs and never store your personal credentials. Your data stays yours."
                    delay={0.2}
                />
                <FeatureCard
                    icon={<Music className="w-6 h-6 text-purple-400" />}
                    title="Metadata Matching"
                    description="Our smart matching algorithm ensures you get the exact song, not a remix or cover."
                    delay={0.4}
                />
            </div>

            {/* FAQ Section */}
            <div id="faq" className="w-full max-w-3xl mb-32 scroll-mt-32">
                <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    <FaqItem
                        question="Is this tool free?"
                        answer="Yes, MelodyTransfer is currently in open beta and 100% free to use."
                        delay={0}
                    />
                    <FaqItem
                        question="Will my playlists remain on the source platform?"
                        answer="Absolutely. We only copy your playlists to the destination; the originals are untouched."
                        delay={0.1}
                    />
                    <FaqItem
                        question="Can I transfer the same playlist twice?"
                        answer="Yes, but we try to prevent duplicates. If you run it again, it might create a new playlist copy."
                        delay={0.2}
                    />
                </div>
            </div>

            {/* Footer */}
            <footer className="w-full py-10 border-t border-white/5 text-center text-neutral-500 text-sm">
                <p>© 2024 MelodyTransfer. Built for music lovers.</p>
            </footer>

        </main>
    )
}

function FeatureCard({ icon, title, description, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ y: -10, rotateX: 5, rotateY: 5 }}
            className="perspective-1000"
        >
            <Card className="p-6 flex flex-col items-start gap-4 bg-white/5 border-white/10 hover:bg-white/10 transition-colors duration-300 h-full">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                        {description}
                    </p>
                </div>
            </Card>
        </motion.div>
    )
}

function FaqItem({ question, answer, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
        >
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-neutral-500" />
                    {question}
                </h3>
                <p className="text-neutral-400 ml-6">{answer}</p>
            </div>
        </motion.div>
    )
}
