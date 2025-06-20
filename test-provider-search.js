const axios = require('axios');

const BASE_URL = 'http://localhost:1919';
const STORE_ID = 'cb5fa29f-f7ac-4f72-9372-64da5d260037';
const AUTH_TOKEN = 'your-auth-token'; // Replace with actual token

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testProviderSearch() {
  try {
    console.log('🔍 Testing Provider Search...\n');

    // Test debug index endpoint
    console.log('1. Checking provider index status...');
    try {
      const debugResponse = await api.get(`/stores/${STORE_ID}/providers/debug/index`);
      console.log('✅ Provider index debug successful');
    } catch (error) {
      console.log('❌ Provider debug error:', error.response?.data || error.message);
    }

    // Test search without query
    console.log('\n2. Testing provider search without query...');
    try {
      const searchResponse = await api.get(`/stores/${STORE_ID}/providers/elasticsearch`);
      console.log('✅ Provider search successful:', {
        total: searchResponse.data.pagination?.total,
        results: searchResponse.data.data?.length
      });
      
      if (searchResponse.data.data?.length > 0) {
        console.log('📋 Sample provider:', {
          id: searchResponse.data.data[0].id,
          name: searchResponse.data.data[0].name,
          email: searchResponse.data.data[0].email
        });
      }
    } catch (error) {
      console.log('❌ Provider search error:', error.response?.data || error.message);
    }

    // Test search with query
    console.log('\n3. Testing provider search with query "test"...');
    try {
      const searchWithQueryResponse = await api.get(`/stores/${STORE_ID}/providers/elasticsearch?q=test`);
      console.log('✅ Provider search with query successful:', {
        total: searchWithQueryResponse.data.pagination?.total,
        results: searchWithQueryResponse.data.data?.length
      });
    } catch (error) {
      console.log('❌ Provider search with query error:', error.response?.data || error.message);
    }

    // Test search with email filter
    console.log('\n4. Testing provider search with email filter...');
    try {
      const searchWithEmailResponse = await api.get(`/stores/${STORE_ID}/providers/elasticsearch?email=test@example.com`);
      console.log('✅ Provider search with email filter successful:', {
        total: searchWithEmailResponse.data.pagination?.total,
        results: searchWithEmailResponse.data.data?.length
      });
    } catch (error) {
      console.log('❌ Provider search with email filter error:', error.response?.data || error.message);
    }

    // Test reindex
    console.log('\n5. Testing provider reindex...');
    try {
      const reindexResponse = await api.get(`/stores/${STORE_ID}/providers/debug/reindex`);
      console.log('✅ Provider reindex successful:', reindexResponse.data);
    } catch (error) {
      console.log('❌ Provider reindex error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProviderSearch(); 