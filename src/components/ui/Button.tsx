import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'premium';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20",
      destructive: "bg-red-500 text-white hover:bg-red-600",
      outline: "border border-slate-800 bg-transparent hover:bg-slate-800 hover:text-white",
      secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700",
      ghost: "hover:bg-slate-800 hover:text-slate-100",
      link: "text-blue-500 underline-offset-4 hover:underline",
      premium: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-xl shadow-blue-500/20"
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-12 rounded-xl px-8 text-lg",
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
