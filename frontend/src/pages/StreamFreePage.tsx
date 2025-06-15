import React from 'react'
import { StreamComparison } from '../components/StreamComparison'
import Page from '@atlaskit/page'


export const StreamFreePage: React.FC = () => {
  return (
    <Page>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <div className="bg-[#23272B] border-l-4 border-[#579DFF] p-4 rounded-md card">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-[#579DFF]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-[#B6C2CF]">
                  Free tier: Limited to 2 requests per hour. <a href="/login" className="font-medium underline text-[#579DFF] hover:text-[#388BFF]">Sign in</a> for unlimited access.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <StreamComparison isFreeTier={true} />
        </div>
      </div>
    </Page>
  )
} 