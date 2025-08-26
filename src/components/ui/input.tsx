import * as React from "react"

import { cn } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium text-gray-800 dark:text-white/90 placeholder:text-gray-500 dark:placeholder:text-white/40 caret-blue-600 dark:caret-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:!opacity-100 disabled:text-gray-700 dark:disabled:text-white/80 disabled:placeholder:text-gray-500 dark:disabled:placeholder:text-white/40",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }