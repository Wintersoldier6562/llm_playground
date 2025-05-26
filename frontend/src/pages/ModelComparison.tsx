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
      <div style={{
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        padding: 40,
        marginTop: 32,
        width: '90vw',
        maxWidth: 1200,
        minWidth: 340,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Model Comparison Table</h2>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <Spinner size="large" />
          </div>
        ) : error ? (
          <div style={{ color: 'red', marginTop: 24 }}>{error}</div>
        ) : (
          <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ minWidth: 220, flex: 1 }}>
              <AtlaskitSelect
                options={providerOptions}
                isMulti
                placeholder="Filter Providers"
                value={providerOptions.filter(opt => providerFilters.includes(opt.value))}
                onChange={opts => setProviderFilters(opts ? opts.map(o => o.value) : [])}
                styles={{
                  container: base => ({ ...base, minWidth: 200 }),
                  menu: base => ({ ...base, backgroundColor: 'white', zIndex: 20 })
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
                  menu: base => ({ ...base, backgroundColor: 'white', zIndex: 20 })
                }}
              />
            </div>
          </div>
        )}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <Spinner size="large" />
          </div>
        ) : error ? (
          <div style={{ color: 'red', marginTop: 24 }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 0 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                minWidth: 700,
                overflow: 'hidden',
              }}
            >
              <thead>
                <tr style={{ background: '#F4F5F7' }}>
                  <th onClick={() => handleSort('provider')} style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6', cursor: 'pointer', userSelect: 'none' }}>
                    Provider {sortKey === 'provider' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('model_name')} style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6', cursor: 'pointer', userSelect: 'none' }}>
                    Model {sortKey === 'model_name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('max_tokens')} style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6', cursor: 'pointer', userSelect: 'none' }}>
                    Max Tokens {sortKey === 'max_tokens' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('input_cost_per_token')} style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6', cursor: 'pointer', userSelect: 'none' }}>
                    Input Cost/1k-Tokens {sortKey === 'input_cost_per_token' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('output_cost_per_token')} style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6', cursor: 'pointer', userSelect: 'none' }}>
                    Output Cost/1k-Tokens {sortKey === 'output_cost_per_token' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model, idx) => (
                  <tr
                    key={`${model.provider}-${model.model_name}`}
                    style={{
                      background: idx % 2 === 0 ? '#FAFBFC' : 'white',
                      transition: 'background 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = '#E6FCFF')}
                    onMouseOut={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#FAFBFC' : 'white')}
                  >
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{model.provider.charAt(0).toUpperCase() + model.provider.slice(1).toLowerCase()}</td>
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{model.model_name}</td>
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{model.max_tokens}</td>
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{(model.input_cost_per_token*1000).toFixed(4)}</td>
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{(model.output_cost_per_token*1000).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && models.length === 0 && !error && (
          <div style={{ marginTop: 24 }}>No models found.</div>
        )}
      </div>
    </Page>
  );
};

export default ModelComparison; 