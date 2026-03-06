import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'danger';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-accent-cyan text-bg-primary hover:bg-accent-cyan/90 shadow": variant === 'default',
                        "border border-border bg-transparent hover:bg-bg-tertiary text-text-primary": variant === 'outline',
                        "hover:bg-bg-tertiary text-text-primary": variant === 'ghost',
                        "bg-error text-white hover:bg-error/90": variant === 'danger',

                        "h-9 px-4 py-2": size === 'default',
                        "h-8 rounded-md px-3 text-xs": size === 'sm',
                        "h-10 rounded-md px-8": size === 'lg',
                        "h-9 w-9": size === 'icon',
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
