const axios = require('axios');

const BASE_URL = 'http://localhost:1919';
const STORE_ID = '550e8400-e29b-41d4-a716-446655440000'; // Replace with actual store ID
const USER_ID = 'test-user-id'; // Replace with actual user ID

// Mock authentication header (replace with actual auth token)
const AUTH_HEADER = {
  'Authorization': 'Bearer test-token',
  'Content-Type': 'application/json'
};

async function testCategoryReindexing() {
  console.log('🧪 Testing Category Elasticsearch Reindexing...\n');

  try {
    // Step 1: Check initial counts
    console.log('📊 Step 1: Checking initial counts...');
    const initialCounts = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/debug/count`, {
      headers: AUTH_HEADER
    });
    console.log('Initial counts:', initialCounts.data);

    // Step 2: Create a new category
    console.log('\n📝 Step 2: Creating a new category...');
    const newCategory = {
      name: `Test Category ${Date.now()}`,
      description: 'Test category for reindexing verification',
      status: 'active',
      storeId: STORE_ID,
      userId: USER_ID
    };

    const createdCategory = await axios.post(`${BASE_URL}/stores/${STORE_ID}/categories`, newCategory, {
      headers: AUTH_HEADER
    });
    console.log('Created category:', createdCategory.data);

    // Wait a moment for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Check counts after creation
    console.log('\n📊 Step 3: Checking counts after creation...');
    const afterCreateCounts = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/debug/count`, {
      headers: AUTH_HEADER
    });
    console.log('Counts after creation:', afterCreateCounts.data);

    // Step 4: Search for the new category
    console.log('\n🔍 Step 4: Searching for the new category...');
    const searchResult = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/elasticsearch?q=${newCategory.name}`, {
      headers: AUTH_HEADER
    });
    console.log('Search results:', searchResult.data);

    // Step 5: Update the category
    console.log('\n✏️ Step 5: Updating the category...');
    const updateData = {
      name: `Updated Test Category ${Date.now()}`,
      description: 'Updated test category description',
      status: 'active',
      storeId: STORE_ID,
      userId: USER_ID
    };

    const updatedCategory = await axios.patch(`${BASE_URL}/stores/${STORE_ID}/categories/${createdCategory.data.id}`, updateData, {
      headers: AUTH_HEADER
    });
    console.log('Updated category:', updatedCategory.data);

    // Wait a moment for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 6: Search for the updated category
    console.log('\n🔍 Step 6: Searching for the updated category...');
    const updatedSearchResult = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/elasticsearch?q=${updateData.name}`, {
      headers: AUTH_HEADER
    });
    console.log('Search results for updated category:', updatedSearchResult.data);

    // Step 7: Delete the category
    console.log('\n🗑️ Step 7: Deleting the category...');
    await axios.delete(`${BASE_URL}/stores/${STORE_ID}/categories/${createdCategory.data.id}`, {
      headers: AUTH_HEADER
    });
    console.log('Category deleted');

    // Wait a moment for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 8: Check final counts
    console.log('\n📊 Step 8: Checking final counts...');
    const finalCounts = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/debug/count`, {
      headers: AUTH_HEADER
    });
    console.log('Final counts:', finalCounts.data);

    // Step 9: Verify the category is not in search results
    console.log('\n🔍 Step 9: Verifying category is removed from search...');
    const finalSearchResult = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/elasticsearch?q=${updateData.name}`, {
      headers: AUTH_HEADER
    });
    console.log('Final search results:', finalSearchResult.data);

    // Step 10: Test manual reindexing
    console.log('\n🔄 Step 10: Testing manual reindexing...');
    const reindexResult = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/debug/reindex-store/${STORE_ID}`, {
      headers: AUTH_HEADER
    });
    console.log('Manual reindex result:', reindexResult.data);

    // Step 11: Final verification
    console.log('\n📊 Step 11: Final verification...');
    const verificationCounts = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/debug/count`, {
      headers: AUTH_HEADER
    });
    console.log('Verification counts:', verificationCounts.data);

    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Initial DB count:', initialCounts.data.database);
    console.log('- Initial ES count:', initialCounts.data.elasticsearch);
    console.log('- Final DB count:', finalCounts.data.database);
    console.log('- Final ES count:', finalCounts.data.elasticsearch);
    console.log('- Reindexing working:', finalCounts.data.synced);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Make sure to update the AUTH_HEADER with a valid authentication token');
    }
    
    if (error.response?.status === 404) {
      console.log('\n💡 Tip: Make sure the server is running on port 1919 and the store ID is valid');
    }
  }
}

// Run the test
testCategoryReindexing(); 