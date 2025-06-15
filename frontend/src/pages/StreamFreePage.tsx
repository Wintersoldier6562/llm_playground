import React from 'react'
import { StreamComparison } from '../components/StreamComparison'

export const StreamFreePage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Compare Models</h1>
      </div>
      <div className="ml-0">
        <p className="text-sm text-[#B6C2CF]">
                  Free tier: Limited to 2 requests per hour. <a href="/login" className="font-medium underline text-[#579DFF] hover:text-[#388BFF]">Sign in</a> for unlimited access.
        </p>
      </div>
      <StreamComparison isFreeTier={true}/>
    </div>
  )
} 