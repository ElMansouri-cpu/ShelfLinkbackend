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

async function testTaxSearch() {
  try {
    console.log('🔍 Testing Tax Search after ID mapping fix...\n');

    // Test debug index endpoint
    console.log('1. Checking tax index status...');
    try {
      const debugResponse = await api.get(`/stores/${STORE_ID}/products/taxes/debug/index`);
      console.log('✅ Tax index debug successful');
    } catch (error) {
      console.log('❌ Tax debug error:', error.response?.data || error.message);
    }

    // Test search without query
    console.log('\n2. Testing tax search without query...');
    try {
      const searchResponse = await api.get(`/stores/${STORE_ID}/products/taxes/elasticsearch`);
      console.log('✅ Tax search successful:', {
        total: searchResponse.data.pagination?.total,
        results: searchResponse.data.data?.length
      });
      
      if (searchResponse.data.data?.length > 0) {
        console.log('📋 Sample tax:', {
          id: searchResponse.data.data[0].id,
          name: searchResponse.data.data[0].name,
          rate: searchResponse.data.data[0].rate
        });
      }
    } catch (error) {
      console.log('❌ Tax search error:', error.response?.data || error.message);
    }

    // Test search with query
    console.log('\n3. Testing tax search with query "TVA"...');
    try {
      const searchWithQueryResponse = await api.get(`/stores/${STORE_ID}/products/taxes/elasticsearch?q=TVA`);
      console.log('✅ Tax search with query successful:', {
        total: searchWithQueryResponse.data.pagination?.total,
        results: searchWithQueryResponse.data.data?.length
      });
    } catch (error) {
      console.log('❌ Tax search with query error:', error.response?.data || error.message);
    }

    // Test reindex
    console.log('\n4. Testing tax reindex...');
    try {
      const reindexResponse = await api.get(`/stores/${STORE_ID}/products/taxes/debug/reindex`);
      console.log('✅ Tax reindex successful:', reindexResponse.data);
    } catch (error) {
      console.log('❌ Tax reindex error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTaxSearch(); 