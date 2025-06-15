import React, { useState, useEffect } from 'react'
import { comparison } from '../services/api'
import { v4 as uuidv4 } from 'uuid'
import { useMutation } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import Checkbox from '@atlaskit/checkbox';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import TextArea from '@atlaskit/textarea';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import SectionMessage from '@atlaskit/section-message';
// @ts-ignore
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

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

interface StreamComparisonProps {
  isFreeTier?: boolean;
}

const MAX_TOKENS_OPTIONS = [
  { value: 256, label: '256 tokens' },
  { value: 512, label: '512 tokens' },
  { value: 1024, label: '1K tokens' },
  { value: 2048, label: '2K tokens' },
  { value: 4096, label: '4K tokens' },
]

export const StreamComparison: React.FC<StreamComparisonProps> = ({ isFreeTier = false }) => {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [providerModelsData, setProviderModelsData] = useState<Record<string, string[]>>({})
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({})
  const [maxTokens, setMaxTokens] = useState<number>(2048)
  const [showRateLimitModal, setShowRateLimitModal] = useState(false)
  const [responses, setResponses] = useState<Record<string, ModelResponse>>({})
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    comparison.getModels()
      .then(setProviderModelsData)
      .catch((err) => {
        if (err?.response?.status === 429 || (err?.message && err.message.includes('429'))) {
          setShowRateLimitModal(true);
        }
      });
  }, [])

  // Auto-select first model for each selected provider
  useEffect(() => {
    selectedProviders.forEach(provider => {
      if (!selectedModels[provider] && providerModelsData[provider]?.length) {
        setSelectedModels(prev => ({
          ...prev,
          [provider]: providerModelsData[provider][0]
        }));
      }
    });
  }, [selectedProviders, providerModelsData]);

  const handleProviderChange = (provider: string) => {
    setSelectedProviders(prev =>
      prev.includes(provider)
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    )
    if (selectedProviders.includes(provider)) {
      setSelectedModels(prev => {
        const copy = { ...prev }
        delete copy[provider]
        return copy
      })
    }
  }

  const handleModelChange = (provider: string, model: string) => {
    setSelectedModels(prev => ({ ...prev, [provider]: model }))
  }

  const handleSave = async () => {
    if (!prompt.trim() || selectedProviders.length === 0) return
    setIsSaving(true)
    try {
      const promptId = uuidv4()
      const now = new Date().toISOString()
      const payload = {
        prompt_id: promptId,
        prompt: prompt,
        max_tokens: maxTokens,
        responses: selectedProviders.map(provider => {
          const response = responses[provider]
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
    } finally {
      setIsSaving(false)
    }
  }

  const streamMutation = useMutation({
    mutationFn: ({ prompt, providerModels, maxTokens }: { prompt: string, providerModels: Record<string, string>, maxTokens: number }) =>
      comparison.compare(prompt, providerModels, isFreeTier, maxTokens),
    onSuccess: async (data: Response) => {
      if (!data.body) {
        throw new Error('No response body');
      }
      const reader = data.body.getReader();
      const decoder = new TextDecoder();
      try {
        let streamError: string | null = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done || streamError) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              if (line.includes('data: [DONE]')) {
                break;
              }
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.error) {
                setServerError("Server Error: Please try again later");
                streamError = data.error;
                // clear the response
                setResponses(prev => {
                  const newResponses = { ...prev }
                  selectedProviders.forEach(key => {
                    newResponses[key] = { ...newResponses[key], content: '' }
                  })
                  return newResponses
                })
              }
              setResponses(prev => {
                const currentResponse = prev[data.provider_name]
                if (!currentResponse) return prev
                const updatedResponse = {
                  ...currentResponse,
                  content: data.content ? currentResponse.content + data.content : currentResponse.content,
                }
                if (data.is_final) {
                  updatedResponse.prompt_tokens = data.prompt_tokens
                  updatedResponse.content = data.content
                  updatedResponse.model_name = data.model_name
                  updatedResponse.total_tokens = data.total_tokens
                  updatedResponse.cost = data.cost
                  updatedResponse.latency = data.latency
                  updatedResponse.created_at = data.created_at
                }
                return {
                  ...prev,
                  [data.provider_name]: updatedResponse
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
    onError: async (error: any) => {
      console.error('Error:', error)
      if (error.message.includes('429: Rate limit exceeded')) {
        setShowRateLimitModal(true)
      } else if (error?.message?.includes('429: Rate limit exceeded')) {
        setShowRateLimitModal(true)
      }
      setResponses(prev => {
        const newResponses = { ...prev }
        selectedProviders.forEach(key => {
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
    if (!prompt.trim() || selectedProviders.length === 0) return
    const providerModels: Record<string, string> = {}
    selectedProviders.forEach(provider => {
      if (selectedModels[provider]) {
        providerModels[provider] = selectedModels[provider]
      }
    })
    setResponses({
      ...Object.fromEntries(selectedProviders.map(p => [p, { model_name: p, display_name: p, content: '', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0, latency: 0, created_at: '' }]))
    })
    setIsLoading(true)
    setIsSaved(false)
    streamMutation.mutate({ prompt, providerModels, maxTokens })
  }

  const hasResponses = selectedProviders.some(provider => responses[provider] && responses[provider].content)

  return (
    <div className="min-h-screen bg-[#0F172A] py-8">
      {showRateLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-[#1E293B] rounded-lg p-6 max-w-md w-full mx-4 border border-[#334155] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[#F8FAFC]">Rate Limit Exceeded</h3>
              <button
                onClick={() => setShowRateLimitModal(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm text-[#94A3B8]">
                You've reached the limit of 2 requests per hour. Sign in to get unlimited access to all features.
              </p>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button className="btn-secondary" onClick={() => setShowRateLimitModal(false)}>
                Close
              </button>
              <a href="/login" className="btn-primary">Sign In</a>
            </div>
          </div>
        </div>
      )}
      {serverError && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-[#1E293B] rounded-lg p-6 max-w-md w-full mx-4 border border-[#334155] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[#F8FAFC]">Server Error</h3>
              <button
                onClick={() => setServerError(null)}
                className="text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm text-[#94A3B8]">
                {serverError}
              </p>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button className="btn-primary" onClick={() => setServerError(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="card mx-auto p-8" style={{ width: '90vw', maxWidth: 1200, minWidth: 340 }}>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <div className="label">Select Providers</div>
            <div>
              {Object.keys(providerModelsData).map(provider => (
                <div key={provider} className="flex items-center mb-4 gap-6" style={{ minWidth: 340, maxWidth: 600 }}>
                  <div style={{ width: 140, flexShrink: 0 }}>
                    <Checkbox
                      isChecked={selectedProviders.includes(provider)}
                      onChange={() => handleProviderChange(provider)}
                      label={<span className="text-[#F8FAFC]">{provider.charAt(0).toUpperCase() + provider.slice(1)}</span>}
                      name={provider}
                    />
                  </div>
                  {selectedProviders.includes(provider) && (
                    <div className="flex-1 min-w-0">
                      <Select
                        options={providerModelsData[provider].map(model => ({ label: model, value: model }))}
                        value={selectedModels[provider] ? { label: selectedModels[provider], value: selectedModels[provider] } : null}
                        onChange={option => handleModelChange(provider, option?.value || '')}
                        placeholder="Select a model"
                        isSearchable
                        styles={{
                          control: base => ({ ...base, background: 'var(--color-input-bg)', borderColor: 'var(--color-input-border)', color: 'var(--color-neutral)' }),
                          menu: base => ({ ...base, backgroundColor: 'var(--color-surface)', color: 'var(--color-neutral)', zIndex: 20 }),
                          singleValue: base => ({ ...base, color: 'var(--color-neutral)' }),
                          option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--color-primary)' : 'var(--color-surface)', color: 'var(--color-neutral)' })
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mb-6 max-w-xs">
            <div className="label">Max Tokens</div>
            <Select
              options={MAX_TOKENS_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
              value={MAX_TOKENS_OPTIONS.find(opt => opt.value === maxTokens) ? { label: MAX_TOKENS_OPTIONS.find(opt => opt.value === maxTokens)!.label, value: maxTokens } : null}
              onChange={option => setMaxTokens(option?.value || 2048)}
              placeholder="Select max tokens"
              styles={{
                control: base => ({ ...base, background: 'var(--color-input-bg)', borderColor: 'var(--color-input-border)', color: 'var(--color-neutral)' }),
                menu: base => ({ ...base, backgroundColor: 'var(--color-surface)', color: 'var(--color-neutral)', zIndex: 20 }),
                singleValue: base => ({ ...base, color: 'var(--color-neutral)' }),
                option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--color-primary)' : 'var(--color-surface)', color: 'var(--color-neutral)' })
              }}
            />
          </div>
          <div className="mb-6 max-w-xl">
            <div className="label">Enter your prompt</div>
            <TextArea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Type your prompt here..."
              className="input"
              style={{ minHeight: 80 }}
            />
          </div>
          <div className="flex gap-4 items-center mb-6">
            <button
              className="btn-primary"
              type="submit"
              disabled={isLoading || !prompt.trim() || selectedProviders.length === 0 || selectedProviders.some(p => !selectedModels[p])}
            >
              {isLoading ? <Spinner size="small" /> : 'Compare Models'}
            </button>
            {hasResponses && !isSaved && !isFreeTier && (
              <button
                className="btn-secondary"
                type="button"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Spinner size="small" /> : 'Save Comparison'}
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="mt-8 grid gap-8 justify-center" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {selectedProviders.map(provider => {
          const response = responses[provider];
          return (
            <div key={provider} className="card flex flex-col min-h-[220px] p-7">
              <h3 className="font-semibold mb-3 text-[#F8FAFC] capitalize">{provider}</h3>
              {response ? (
                <>
                  {response.error ? (
                    <SectionMessage appearance="error">{response.error}</SectionMessage>
                  ) : (
                    <div className="bg-[#23272B] rounded-md p-3 overflow-x-auto">
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown>{response.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {response.total_tokens > 0 && (
                    <div className="mt-4 text-xs text-[#94A3B8]">
                      <div>Tokens: {response.total_tokens}</div>
                      <div>Latency: {response.latency.toFixed(2)}s</div>
                      {!isFreeTier && <div>Cost: ${response.cost.toFixed(4)}</div>}
                    </div>
                  )}
                </>
              ) : (
                <SectionMessage appearance="information">No response yet</SectionMessage>
              )}
            </div>
          );
        })}
      </div>
    </div>
  )
} 