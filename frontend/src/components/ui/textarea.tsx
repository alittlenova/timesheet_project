import React from 'react'

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring focus:border-blue-500"
      rows={4}
      {...props}
    />
  )
}
