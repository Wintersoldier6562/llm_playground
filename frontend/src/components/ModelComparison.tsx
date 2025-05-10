import React, { useState } from 'react'
import config from '../config'

interface ModelResponse {
  model: string
  response: string
  error?: string
}

export const ModelComparison: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [responses, setResponses] = useState<Record<string, ModelResponse>>({
    'gpt-4': { model: 'GPT-4', response: '' },
    'claude-3': { model: 'Claude 3', response: '' },
    'xai': { model: 'XAI', response: '' }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    // Reset responses
    setResponses({
      'gpt-4': { model: 'GPT-4', response: '' },
      'claude-3': { model: 'Claude 3', response: '' },
      'xai': { model: 'XAI', response: '' }
    })
    setIsLoading(true)

    try {
      const eventSource = new EventSource(
        `${config.apiUrl}/compare/stream?prompt=${encodeURIComponent(prompt)}`
      )

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setResponses(prev => ({
          ...prev,
          [data.model]: {
            ...prev[data.model],
            response: prev[data.model].response + (data.chunk || ''),
            error: data.error
          }
        }))
      }

      eventSource.onerror = () => {
        eventSource.close()
        setIsLoading(false)
      }

      // Close the connection after 30 seconds to prevent hanging
      setTimeout(() => {
        eventSource.close()
        setIsLoading(false)
      }, 30000)
    } catch (error) {
      console.error('Error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
            Enter your prompt
          </label>
          <div className="mt-1">
            <textarea
              id="prompt"
              name="prompt"
              rows={4}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type your prompt here..."
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isLoading ? 'Comparing...' : 'Compare Models'}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(responses).map(([key, response]) => (
          <div key={key} className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{response.model}</h3>
            <div className="prose max-w-none">
              {response.error ? (
                <p className="text-red-500">{response.error}</p>
              ) : (
                <p className="whitespace-pre-wrap">{response.response || 'Waiting for response...'}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 