import React from 'react'
import { StreamComparison } from '../components/StreamComparison'
import { PageHeader } from '../components/PageHeader'

const StreamPage: React.FC = () => {
  return (
    <>
      <PageHeader title="Compare Models" />
      <div className="p-8">
        <StreamComparison />
      </div>
    </>
  )
}

export default StreamPage 