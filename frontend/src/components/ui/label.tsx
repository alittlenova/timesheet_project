import React from 'react'

export function Label({ children, htmlFor, className = '' }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`block font-medium mb-1 ${className}`}>
      {children}
    </label>
  )
}
