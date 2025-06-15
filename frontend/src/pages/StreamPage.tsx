import React from 'react'
import { StreamComparison } from '../components/StreamComparison'

export const StreamPage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Compare Models</h1>
      </div>
      <StreamComparison />
    </div>
  )
} 