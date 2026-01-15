"use client";

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const Button = React.forwardRef(({ className, variant = "primary", size = "default", isLoading, children, ...props }, ref) => {

    const variants = {
        primary: "bg-green-500 hover:bg-green-400 text-black font-bold shadow-[0_0_20px_rgba(29,185,84,0.3)] hover:shadow-[0_0_30px_rgba(29,185,84,0.5)] border-transparent",
        secondary: "bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700 border hover:border-neutral-600",
        ghost: "bg-transparent hover:bg-white/10 text-neutral-300 hover:text-white border-transparent",
        youtube: "bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_20px_rgba(255,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] border-transparent"
    }

    const sizes = {
        default: "h-11 px-8 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-10 text-lg",
        icon: "h-10 w-10 px-0"
    }

    return (
        <motion.button
            ref={ref}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "relative inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 overflow-hidden",
                variants[variant],
                sizes[size],
                className
            )}
            disabled={isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <span className="relative z-10 flex items-center gap-2">{children}</span>
        </motion.button>
    )
})
Button.displayName = "Button"

export { Button }
