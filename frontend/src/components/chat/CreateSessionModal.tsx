import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatService, type CreateSessionRequest } from '../../services/chatService';
import { comparison } from '../../services/api';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import { createPortal } from 'react-dom';
import Spinner from '@atlaskit/spinner';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Model {
  id: string;
  name: string;
  provider: string;
}

interface ApiModel {
  model_name: string;
  provider: string;
}

const selectStyles = {
  control: (base: any) => ({ 
    ...base, 
    background: '#1E293B', 
    color: 'white', 
    borderColor: '#334155', 
    borderRadius: 10,
    '&:hover': {
      borderColor: '#475569'
    }
  }),
  menuPortal: (base: any) => ({ 
    ...base, 
    zIndex: 9999 
  }),
  menu: (base: any) => ({ 
    ...base, 
    background: '#1E293B',
    color: 'white', 
    borderRadius: 10,
    border: '1px solid #334155',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }),
  menuList: (base: any) => ({
    ...base,
    background: '#1E293B',
    padding: '4px'
  }),
  singleValue: (base: any) => ({ 
    ...base, 
    color: 'white' 
  }),
  option: (base: any, state: any) => ({ 
    ...base, 
    background: state.isFocused ? '#3B82F6' : '#1E293B',
    color: 'white', 
    borderRadius: 6,
    cursor: 'pointer',
    ':active': {
      background: '#2563EB'
    }
  }),
  input: (base: any) => ({
    ...base,
    color: 'white'
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#94A3B8'
  })
};

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ isOpen, onClose }) => {
  console.log('CreateSessionModal render:', { isOpen });

  const queryClient = useQueryClient();
  const [title, setTitle] = React.useState('');
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const [selectedModel, setSelectedModel] = React.useState<Model | null>(null);
  
  const { data: models, isLoading: isLoadingModels } = useQuery({
    queryKey: ['providerModels'],
    queryFn: async () => {
      const data = await comparison.getProviderModels();
      return (data as ApiModel[]).map((model: ApiModel) => ({
        id: model.model_name,
        name: model.model_name.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        provider: model.provider
      }));
    }
  });

  // Get unique providers from models
  const providers = React.useMemo(() => {
    if (!models) return [];
    return Array.from(new Set(models.map(m => m.provider)));
  }, [models]);

  // Filter models by selected provider
  const providerModels = React.useMemo(() => {
    if (!models || !selectedProvider) return [];
    return models.filter(m => m.provider === selectedProvider);
  }, [models, selectedProvider]);

  // Set initial provider and model when data is loaded
  React.useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
    }
  }, [providers, selectedProvider]);

  // Update selected model when provider changes
  React.useEffect(() => {
    if (providerModels.length > 0) {
      setSelectedModel(providerModels[0]);
    } else {
      setSelectedModel(null);
    }
  }, [providerModels]);

  const createMutation = useMutation({
    mutationFn: (data: CreateSessionRequest) => chatService.createSession(data),
    onSuccess: () => {
      console.log('Session created successfully');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onClose();
    },
    onError: (error) => {
      console.error('Failed to create session:', error);
    }
  });

  if (!isOpen) {
    console.log('Modal not open, returning null');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;
    
    console.log('Form submitted:', { title, selectedModel });
    createMutation.mutate({
      title: title.trim() || undefined,
      model: selectedModel.id,
      provider: selectedModel.provider,
    });
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '18px',
          padding: '24px',
          width: '500px',
          maxWidth: '90vw',
          position: 'relative',
          zIndex: 1001,
        }}
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
          <div className="flex flex-col items-center w-full mb-2">
            <div className="bg-[#3B82F6]/10 rounded-full p-3 mb-2 flex items-center justify-center">
              <HiChatBubbleLeftRight className="text-[#3B82F6]" size={36} />
            </div>
            <h2 className="text-xl font-bold text-[#F8FAFC] mb-1">Create New Chat Session</h2>
            <p className="text-sm text-[#94A3B8] mb-4 text-center">Start a new conversation by giving it a name and choosing a model.</p>
          </div>
          <div className="mb-4 w-full">
            <label className="label mb-1">Title <span className="text-[#64748B]">(optional)</span></label>
            <Textfield
              value={title}
              onChange={e => setTitle((e.target as HTMLInputElement).value)}
              placeholder="Enter session title"
              className="input"
              style={{ background: 'var(--color-input-bg)', color: 'white', borderColor: 'var(--color-input-border)' }}
              autoFocus
            />
          </div>
          <div className="mb-4 w-full">
            <label className="label mb-1">Provider</label>
            {isLoadingModels ? (
              <div className="flex items-center justify-center p-4">
                <Spinner size="medium" />
              </div>
            ) : (
              <Select
                classNamePrefix="react-select"
                options={providers.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                value={selectedProvider ? { value: selectedProvider, label: selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1) } : null}
                onChange={opt => setSelectedProvider((opt as any)?.value)}
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            )}
          </div>
          <div className="mb-2 w-full">
            <label className="label mb-1">Model</label>
            {isLoadingModels ? (
              <div className="flex items-center justify-center p-4">
                <Spinner size="medium" />
              </div>
            ) : (
              <Select
                classNamePrefix="react-select"
                options={providerModels.map(m => ({ value: m.id, label: m.name }))}
                value={selectedModel ? { value: selectedModel.id, label: selectedModel.name } : null}
                onChange={opt => {
                  const model = providerModels.find(m => m.id === (opt as any)?.value);
                  if (model) setSelectedModel(model);
                }}
                isDisabled={!selectedProvider}
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            )}
            <p className="text-xs text-[#94A3B8] mt-1">Choose the AI model for this chat session.</p>
          </div>
          <div className="flex w-full justify-end gap-2 mt-6">
            <button
              type="button"
              className="btn-secondary min-w-[100px]"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary min-w-[140px]"
              disabled={createMutation.isPending || !selectedModel}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}; 