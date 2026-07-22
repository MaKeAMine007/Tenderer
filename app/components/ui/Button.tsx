'use client'

import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
}

const VARIANTS = {
  primary:
    'bg-zinc-900 text-white hover:bg-zinc-700 border-transparent disabled:bg-zinc-300',
  secondary:
    'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50 disabled:text-zinc-400',
  ghost:
    'bg-transparent text-zinc-600 border-transparent hover:bg-zinc-100 hover:text-zinc-900 disabled:text-zinc-300',
  danger:
    'bg-white text-red-600 border-red-200 hover:bg-red-50 disabled:text-red-300',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-2 font-medium rounded border
        transition-colors cursor-pointer select-none
        disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      {...props}
    >
      {loading && (
        <svg
          className="w-3.5 h-3.5 animate-spin shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
