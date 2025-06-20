const axios = require('axios');

const BASE_URL = 'http://localhost:1919'; // Adjust if your server runs on different port
const STORE_ID = 'cb5fa29f-f7ac-4f72-9372-64da5d260037'; // From the logs
const AUTH_TOKEN = 'your-auth-token'; // Replace with actual token

// Create axios instance with default headers
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testCategorySearch() {
  try {
    console.log('🔍 Testing Category Search...\n');

    // 1. Test debug index endpoint
    console.log('1. Checking index status...');
    try {
      const debugResponse = await api.get(`/stores/${STORE_ID}/categories/debug/index`);
      console.log('Index debug response:', debugResponse.data);
    } catch (error) {
      console.log('Debug endpoint error:', error.response?.data || error.message);
    }

    // 2. Test search without query (should return all categories)
    console.log('\n2. Testing search without query...');
    try {
      const searchResponse = await api.get(`/stores/${STORE_ID}/categories/elasticsearch`);
      console.log('Search response:', {
        total: searchResponse.data.pagination?.total,
        results: searchResponse.data.data?.length,
        data: searchResponse.data.data?.slice(0, 2) // Show first 2 results
      });
    } catch (error) {
      console.log('Search error:', error.response?.data || error.message);
    }

    // 3. Test search with query
    console.log('\n3. Testing search with query "test"...');
    try {
      const searchWithQueryResponse = await api.get(`/stores/${STORE_ID}/categories/elasticsearch?q=test`);
      console.log('Search with query response:', {
        total: searchWithQueryResponse.data.pagination?.total,
        results: searchWithQueryResponse.data.data?.length,
        data: searchWithQueryResponse.data.data?.slice(0, 2)
      });
    } catch (error) {
      console.log('Search with query error:', error.response?.data || error.message);
    }

    // 4. Test search with status filter
    console.log('\n4. Testing search with status filter...');
    try {
      const searchWithStatusResponse = await api.get(`/stores/${STORE_ID}/categories/elasticsearch?status=active`);
      console.log('Search with status filter response:', {
        total: searchWithStatusResponse.data.pagination?.total,
        results: searchWithStatusResponse.data.data?.length,
        data: searchWithStatusResponse.data.data?.slice(0, 2)
      });
    } catch (error) {
      console.log('Search with status filter error:', error.response?.data || error.message);
    }

    // 5. Test reindex
    console.log('\n5. Testing reindex...');
    try {
      const reindexResponse = await api.get(`/stores/${STORE_ID}/categories/debug/reindex`);
      console.log('Reindex response:', reindexResponse.data);
    } catch (error) {
      console.log('Reindex error:', error.response?.data || error.message);
    }

    // 6. Test debug store categories
    console.log('\n6. Testing debug store categories...');
    try {
      const debugStoreResponse = await api.get(`/stores/${STORE_ID}/categories/debug/store/${STORE_ID}`);
      console.log('Debug store response:', debugStoreResponse.data);
    } catch (error) {
      console.log('Debug store error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testCategorySearch(); 