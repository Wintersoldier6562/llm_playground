const config = {
  apiUrl: import.meta.env.API_URL || 'http://localhost:8000/api/v1',
};

console.log('Config API URL:', import.meta.env.API_URL);

export default config; 