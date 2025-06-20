const axios = require('axios');

const BASE_URL = 'http://localhost:1919';
const STORE_ID = 'cb5fa29f-f7ac-4f72-9372-64da5d260037';
const AUTH_TOKEN = 'your-auth-token';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testAllSearchAPIs() {
  try {
    console.log('🔍 Testing All Search APIs...\n');

    console.log('📂 === CATEGORIES SEARCH ===');
    await testCategorySearch();

    console.log('\n📏 === UNITS SEARCH ===');
    await testUnitSearch();

    console.log('\n💰 === TAXES SEARCH ===');
    await testTaxSearch();

    console.log('\n👥 === PROVIDERS SEARCH ===');
    await testProviderSearch();

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

async function testCategorySearch() {
  try {
    console.log('1. Category search without query...');
    const response = await api.get(`/stores/${STORE_ID}/categories/elasticsearch`);
    console.log('✅ Response:', {
      total: response.data.pagination?.total,
      results: response.data.data?.length
    });
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

async function testUnitSearch() {
  try {
    console.log('1. Unit search without query...');
    const response = await api.get(`/stores/${STORE_ID}/units/elasticsearch`);
    console.log('✅ Response:', {
      total: response.data.pagination?.total,
      results: response.data.data?.length
    });
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

async function testTaxSearch() {
  try {
    console.log('1. Tax search without query...');
    const response = await api.get(`/stores/${STORE_ID}/products/taxes/elasticsearch`);
    console.log('✅ Response:', {
      total: response.data.pagination?.total,
      results: response.data.data?.length
    });
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

async function testProviderSearch() {
  try {
    console.log('1. Provider search without query...');
    const response = await api.get(`/stores/${STORE_ID}/providers/elasticsearch`);
    console.log('✅ Response:', {
      total: response.data.pagination?.total,
      results: response.data.data?.length
    });
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

testAllSearchAPIs(); 