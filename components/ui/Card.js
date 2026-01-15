"use client";

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, children, hoverEffect = true, ...props }, ref) => {
    return (
        <motion.div
            ref={ref}
            initial={hoverEffect ? { y: 0 } : undefined}
            whileHover={hoverEffect ? { y: -5 } : undefined}
            className={cn(
                "rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-xl overflow-hidden",
                className
            )}
            {...props}
        >
            <div className="relative z-10">
                {children}
            </div>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        </motion.div>
    )
})
Card.displayName = "Card"

export { Card }
