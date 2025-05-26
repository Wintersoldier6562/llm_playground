import React, { useState, useEffect } from 'react'
import { comparison } from '../services/api'
import { v4 as uuidv4 } from 'uuid'
import { useMutation } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import Checkbox from '@atlaskit/checkbox';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/standard-button';
import Spinner from '@atlaskit/spinner';
import TextArea from '@atlaskit/textarea';
import Page from '@atlaskit/page';
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
  const [tabIndices, setTabIndices] = useState<Record<string, number>>({});

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
                  updatedResponse.completion_tokens = data.completion_tokens
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
    <Page>
      {showRateLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Rate Limit Exceeded</h3>
              <button
                onClick={() => setShowRateLimitModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                You've reached the limit of 2 requests per hour. Sign in to get unlimited access to all features.
              </p>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <Button appearance="subtle" onClick={() => setShowRateLimitModal(false)}>
                Close
              </Button>
              <Button appearance="primary" href="/login">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
      {serverError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Server Error</h3>
              <button
                onClick={() => setServerError(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {serverError}
              </p>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <Button appearance="primary" onClick={() => setServerError(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 40, marginTop: 32, maxWidth: 1400, marginLeft: 'auto', marginRight: 'auto' }}>
        <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Model Comparison</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>Select Providers</div>
            <div>
              {Object.keys(providerModelsData).map(provider => (
                <div key={provider} style={{ marginBottom: 16 }}>
                  <Checkbox
                    isChecked={selectedProviders.includes(provider)}
                    onChange={() => handleProviderChange(provider)}
                    label={provider.charAt(0).toUpperCase() + provider.slice(1)}
                    name={provider}
                  />
                  {selectedProviders.includes(provider) && (
                    <div style={{ marginTop: 8, marginLeft: 32, maxWidth: 340 }}>
                      <Select
                        options={providerModelsData[provider].map(model => ({ label: model, value: model }))}
                        value={selectedModels[provider] ? { label: selectedModels[provider], value: selectedModels[provider] } : null}
                        onChange={option => handleModelChange(provider, option?.value || '')}
                        placeholder="Select a model"
                        isSearchable
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 24, maxWidth: 340 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>Max Tokens</div>
            <Select
              options={MAX_TOKENS_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
              value={MAX_TOKENS_OPTIONS.find(opt => opt.value === maxTokens) ? { label: MAX_TOKENS_OPTIONS.find(opt => opt.value === maxTokens)!.label, value: maxTokens } : null}
              onChange={option => setMaxTokens(option?.value || 2048)}
              placeholder="Select max tokens"
            />
          </div>
          <div style={{ marginBottom: 24, maxWidth: 600 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>Enter your prompt</div>
            <TextArea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Type your prompt here..."
            />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
            <Button
              appearance="primary"
              type="submit"
              isDisabled={isLoading || !prompt.trim() || selectedProviders.length === 0 || selectedProviders.some(p => !selectedModels[p])}
            >
              {isLoading ? <Spinner size="small" /> : 'Compare Models'}
            </Button>
            {hasResponses && !isSaved && !isFreeTier && (
              <Button
                appearance="default"
                onClick={handleSave}
                isDisabled={isSaving}
              >
                {isSaving ? <Spinner size="small" /> : 'Save Comparison'}
              </Button>
            )}
          </div>
        </form>
      </div>
      <div style={{ marginTop: 32, width: '100%', display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center' }}>
        {selectedProviders.map(provider => {
          const response = responses[provider];
          const tab = tabIndices[provider] || 0;
          const handleTabChange = (newTab: number) => {
            setTabIndices(prev => ({ ...prev, [provider]: newTab }));
          };
          return (
            <div key={provider} style={{
              background: '#FAFBFC',
              borderRadius: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              padding: 28,
              minHeight: 220,
              minWidth: 370,
              maxWidth: 480,
              flex: '1 1 370px',
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
            }}>
              <h3 style={{ fontWeight: 600, marginBottom: 12, textTransform: 'capitalize' }}>{provider}</h3>
              {response ? (
                <>
                  <Tabs id={`tabs-${provider}`} selected={tab} onChange={handleTabChange}>
                    <TabList>
                      <Tab>Markdown</Tab>
                      <Tab>XML</Tab>
                    </TabList>
                    <TabPanel>
                      {response.error
                        ? <SectionMessage appearance="error">{response.error}</SectionMessage>
                        : <div style={{ background: 'white', borderRadius: 4, padding: 12, overflowX: 'auto' }}>
                            <ReactMarkdown>{response.content}</ReactMarkdown>
                          </div>
                      }
                    </TabPanel>
                    <TabPanel>
                      <div style={{ background: 'white', borderRadius: 4, padding: 12, overflowX: 'auto' }}>
                        <SyntaxHighlighter language="xml" style={docco} showLineNumbers>
                          {response.content}
                        </SyntaxHighlighter>
                      </div>
                    </TabPanel>
                  </Tabs>
                  {response.total_tokens > 0 && (
                    <div style={{ marginTop: 16, fontSize: 13, color: '#6B778C' }}>
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
    </Page>
  )
} 