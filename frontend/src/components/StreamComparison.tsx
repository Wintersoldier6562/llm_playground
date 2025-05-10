import React, { useState } from 'react'
import { comparison } from '../services/api'
import { v4 as uuidv4 } from 'uuid'
import { useMutation } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'

interface ModelResponse {
  model_name: string
  display_name: string
  content: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost: number
  latency: number
  created_at: string
  error?: string
}

const AVAILABLE_MODELS = [
  { id: 'openai', name: 'GPT-4' },
  { id: 'anthropic', name: 'Claude 3' },
  { id: 'xai', name: 'XAI' }
]

export const StreamComparison: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [selectedModels, setSelectedModels] = useState<string[]>(['openai', 'anthropic', 'xai'])
  const [responses, setResponses] = useState<Record<string, ModelResponse>>({
    'openai': { model_name: 'openai', display_name: 'GPT-4', content: '', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0, latency: 0, created_at: '' },
    'anthropic': { model_name: 'anthropic', display_name: 'Claude 3', content: '', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0, latency: 0, created_at: '' },
    'xai': { model_name: 'xai', display_name: 'XAI', content: '', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0, latency: 0, created_at: '' }
  })

  const handleModelSelection = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  const handleSave = async () => {
    if (!prompt.trim() || selectedModels.length === 0) return
    setIsSaving(true)
    try {
      const promptId = uuidv4()
      const now = new Date().toISOString()
      const payload = {
        prompt_id: promptId,
        prompt: prompt,
        responses: selectedModels.map(modelId => {
          const response = responses[modelId]
          return {
            model_name: response.model_name,
            content: response.content,
            usage: {
              prompt_tokens: response.prompt_tokens,
              completion_tokens: response.completion_tokens,
              total_tokens: response.total_tokens
            },
            cost: response.cost,
            latency: response.latency,
            created_at: response.created_at || now
          }
        }),
        created_at: now
      }
      await comparison.create(payload)
      setIsSaved(true)
    } catch (error) {
      console.error('Error saving comparison:', error)
      // TODO: Add alert
      // No alert, just do nothing
    } finally {
      setIsSaving(false)
    }
  }

  const streamMutation = useMutation({
    mutationFn: () => comparison.compare(prompt, selectedModels),
    onSuccess: async (data: Response) => {
      if (!data.body) {
        throw new Error('No response body');
      }
      const reader = data.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              if (line.includes('data: [DONE]')) {
                break
              }
              const data = JSON.parse(line.replace('data: ', ''));
              
              setResponses(prev => {
                const currentResponse = prev[data.model_name]
                if (!currentResponse) return prev

                const updatedResponse = {
                  ...currentResponse,
                  content: data.content ? currentResponse.content + data.content : currentResponse.content,
                }

                if (data.is_final) {
                  updatedResponse.prompt_tokens = data.prompt_tokens
                  updatedResponse.completion_tokens = data.completion_tokens
                  updatedResponse.total_tokens = data.total_tokens
                  updatedResponse.cost = data.cost
                  updatedResponse.latency = data.latency
                  updatedResponse.created_at = data.created_at
                }

                return {
                  ...prev,
                  [data.model_name]: updatedResponse
                }
              })
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error reading stream:', error);
      }
    },
    onError: (error: Error) => {
      console.error('Error:', error)
      setResponses(prev => {
        const newResponses = { ...prev }
        selectedModels.forEach(key => {
          newResponses[key] = {
            ...newResponses[key],
            error: 'Failed to fetch response'
          }
        })
        return newResponses
      })
    },
    onSettled: () => {
      setIsLoading(false)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || selectedModels.length === 0) return
    setResponses({
      'openai': { model_name: 'openai', display_name: 'GPT-4', content: '', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0, latency: 0, created_at: '' },
      'anthropic': { model_name: 'anthropic', display_name: 'Claude 3', content: '', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0, latency: 0, created_at: '' },
      'xai': { model_name: 'xai', display_name: 'XAI', content: '', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0, latency: 0, created_at: '' }
    })
    setIsLoading(true)
    setIsSaved(false)
    streamMutation.mutate()
  }

  const hasResponses = selectedModels.some(modelId => responses[modelId].content)

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Model Comparison</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select Models to Compare</h3>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map(model => (
                <label key={model.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.id)}
                    onChange={() => handleModelSelection(model.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{model.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="prompt" className="block text-lg font-medium">
              Enter your prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              placeholder="Type your prompt here..."
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isLoading || !prompt.trim() || selectedModels.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Comparing...
                </>
              ) : (
                'Compare Models'
              )}
            </button>
            {hasResponses && !isSaved && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Comparison'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {selectedModels.map(modelId => {
          const response = responses[modelId]
          return (
            <div key={modelId} className="bg-white shadow rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">{response.display_name}</h3>
              {response.error ? (
                <p className="text-red-500">{response.error}</p>
              ) : (
                <div className="space-y-4">
                  <div className="whitespace-pre-wrap">
                    <ReactMarkdown>{response.content || 'Waiting for response...'}</ReactMarkdown>
                  </div>
                  {response.content && (
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Tokens: {response.total_tokens || 0}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Cost: ${response.cost.toFixed(4) || 0}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Latency: {response.latency.toFixed(2) || 0}s
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
} 