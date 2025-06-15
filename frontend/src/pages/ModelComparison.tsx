import React, { useEffect, useState } from 'react';
import { comparison } from '../services/api';
import Spinner from '@atlaskit/spinner';
import Page from '@atlaskit/page';
import AtlaskitSelect from '@atlaskit/select';


interface ProviderModel {
  model_name: string;
  max_tokens: number;
  input_cost_per_token: number;
  output_cost_per_token: number;
  mode: string;
  provider: string;
}

const ModelComparison: React.FC = () => {
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'provider' | 'model_name' | 'max_tokens' | 'input_cost_per_token' | 'output_cost_per_token'>('provider');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [providerFilters, setProviderFilters] = useState<string[]>([]);
  const [modelFilters, setModelFilters] = useState<string[]>([]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedModels = [...models].sort((a, b) => {
    let aValue = a[sortKey];
    let bValue = b[sortKey];
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const uniqueProviders = Array.from(new Set(models.map(m => m.provider.charAt(0).toUpperCase() + m.provider.slice(1).toLowerCase())));
  const uniqueModels = providerFilters.length
    ? Array.from(new Set(models.filter(m => providerFilters.includes(m.provider.charAt(0).toUpperCase() + m.provider.slice(1).toLowerCase())).map(m => m.model_name)))
    : Array.from(new Set(models.map(m => m.model_name)));

  const providerOptions = uniqueProviders.map(p => ({ label: p, value: p }));
  const modelOptions = uniqueModels.map(m => ({ label: m, value: m }));

  // Reset model filters if not available for selected providers
  useEffect(() => {
    if (modelFilters.length && modelFilters.some(m => !uniqueModels.includes(m))) {
      setModelFilters(modelFilters.filter(m => uniqueModels.includes(m)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerFilters]);

  const filteredModels = sortedModels.filter(m =>
    (providerFilters.length === 0 || providerFilters.includes(m.provider.charAt(0).toUpperCase() + m.provider.slice(1).toLowerCase())) &&
    (modelFilters.length === 0 || modelFilters.includes(m.model_name))
  );

  useEffect(() => {
    comparison.getProviderModels()
      .then((data) => {
        setModels(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch model data.');
        setLoading(false);
      });
  }, []);

  return (
    <Page>
      <div className="card mx-auto mt-8 p-8" style={{ width: '90vw', maxWidth: 1200, minWidth: 340 }}>
        <h2 className="font-bold text-2xl text-white mb-6">Model Comparison Table</h2>
        {loading ? (
          <div className="flex justify-center items-center mt-10">
            <Spinner size="large" />
          </div>
        ) : error ? (
          <div className="text-[#EF5C48] mt-6">{error}</div>
        ) : (
          <div className="mb-6 flex gap-4 items-center">
            <div style={{ minWidth: 220, flex: 1 }}>
              <AtlaskitSelect
                options={providerOptions}
                isMulti
                placeholder="Filter Providers"
                value={providerOptions.filter(opt => providerFilters.includes(opt.value))}
                onChange={opts => setProviderFilters(opts ? opts.map(o => o.value) : [])}
                styles={{
                  container: base => ({ ...base, minWidth: 200 }),
                  menu: base => ({ ...base, backgroundColor: 'var(--color-surface)', color: 'white', zIndex: 20 }),
                  singleValue: base => ({ ...base, color: 'white' }),
                  option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--color-primary)' : 'var(--color-surface)', color: 'white' })
                }}
              />
            </div>
            <div style={{ minWidth: 220, flex: 1 }}>
              <AtlaskitSelect
                options={modelOptions}
                isMulti
                placeholder="Filter Models"
                value={modelOptions.filter(opt => modelFilters.includes(opt.value))}
                onChange={opts => setModelFilters(opts ? opts.map(o => o.value) : [])}
                styles={{
                  container: base => ({ ...base, minWidth: 200 }),
                  menu: base => ({ ...base, backgroundColor: 'var(--color-surface)', color: 'white', zIndex: 20 }),
                  singleValue: base => ({ ...base, color: 'white' }),
                  option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--color-primary)' : 'var(--color-surface)', color: 'white' })
                }}
              />
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center items-center mt-10">
            <Spinner size="large" />
          </div>
        ) : error ? (
          <div className="text-[#EF5C48] mt-6">{error}</div>
        ) : (
          <div className="overflow-x-auto mt-0">
            <table
              className="w-full min-w-[700px] border-separate border-spacing-0 overflow-hidden"
              style={{ background: 'var(--color-surface)' }}
            >
              <thead>
                <tr style={{ background: '#23272B' }}>
                  <th onClick={() => handleSort('provider')} className="p-4 text-left font-semibold text-[#B6C2CF] border-b border-[#2C333A] cursor-pointer select-none">
                    Provider {sortKey === 'provider' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('model_name')} className="p-4 text-left font-semibold text-[#B6C2CF] border-b border-[#2C333A] cursor-pointer select-none">
                    Model {sortKey === 'model_name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('max_tokens')} className="p-4 text-left font-semibold text-[#B6C2CF] border-b border-[#2C333A] cursor-pointer select-none">
                    Max Tokens {sortKey === 'max_tokens' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('input_cost_per_token')} className="p-4 text-left font-semibold text-[#B6C2CF] border-b border-[#2C333A] cursor-pointer select-none">
                    Input Cost/1k-Tokens {sortKey === 'input_cost_per_token' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('output_cost_per_token')} className="p-4 text-left font-semibold text-[#B6C2CF] border-b border-[#2C333A] cursor-pointer select-none">
                    Output Cost/1k-Tokens {sortKey === 'output_cost_per_token' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model, idx) => (
                  <tr
                    key={`${model.provider}-${model.model_name}`}
                    className={idx % 2 === 0 ? 'bg-[#23272B]' : 'bg-[#1B2638]'}
                    style={{ transition: 'background 0.2s', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#2C333A')}
                    onMouseOut={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#23272B' : '#1B2638')}
                  >
                    <td className="p-4 border-b border-[#2C333A] text-[#B6C2CF] text-base">{model.provider.charAt(0).toUpperCase() + model.provider.slice(1).toLowerCase()}</td>
                    <td className="p-4 border-b border-[#2C333A] text-[#B6C2CF] text-base">{model.model_name}</td>
                    <td className="p-4 border-b border-[#2C333A] text-[#B6C2CF] text-base">{model.max_tokens}</td>
                    <td className="p-4 border-b border-[#2C333A] text-[#B6C2CF] text-base">{(model.input_cost_per_token*1000).toFixed(4)}</td>
                    <td className="p-4 border-b border-[#2C333A] text-[#B6C2CF] text-base">{(model.output_cost_per_token*1000).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && models.length === 0 && !error && (
          <div className="text-[#B6C2CF] mt-6">No models found.</div>
        )}
      </div>
    </Page>
  );
};

export default ModelComparison; 