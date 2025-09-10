import React from 'react'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring focus:border-blue-500"
      {...props}
    />
  )
}
