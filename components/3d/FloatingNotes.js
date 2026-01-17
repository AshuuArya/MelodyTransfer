"use client";
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';

function Note({ position, rotation, scale, symbol, color }) {
    const ref = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        // Bobbing motion driven by math
        ref.current.position.y += Math.sin(t * 2 + position[0]) * 0.002;
        ref.current.rotation.z += Math.cos(t * 0.5 + position[1]) * 0.01;
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <group ref={ref} position={position} rotation={rotation} scale={scale}>
                <Text
                    font="/fonts/Inter-Bold.woff" // Fallback or standard font
                    fontSize={1}
                    color={color}
                    anchorX="center"
                    anchorY="middle"
                    fillOpacity={0.8}
                >
                    {symbol}
                </Text>
            </group>
        </Float>
    );
}

export default function FloatingNotes() {
    // Generate random notes
    const notes = [
        { symbol: '♪', pos: [-3, 2, -2], color: '#1DB954' }, // Spotify Green
        { symbol: '♫', pos: [3, -1, -1], color: '#FF0000' }, // YouTube Red
        { symbol: '♩', pos: [-2, -2, 0], color: '#ffffff' },
        { symbol: '♬', pos: [2, 2, -3], color: '#1DB954' },
        { symbol: '♭', pos: [0, 3, -5], color: '#FF0000' },
        { symbol: '♯', pos: [0, -3, -4], color: '#ffffff' },
    ];

    return (
        <group>
            {notes.map((note, i) => (
                <Note
                    key={i}
                    position={note.pos}
                    rotation={[Math.random(), Math.random(), Math.random()]}
                    scale={[1, 1, 1]}
                    symbol={note.symbol}
                    color={note.color}
                />
            ))}
        </group>
    );
}
