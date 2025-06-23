const axios = require('axios');

const BASE_URL = 'http://localhost:1919';
const STORE_ID = '550e8400-e29b-41d4-a716-446655440000'; // Replace with actual store ID
const USER_ID = 'test-user-id'; // Replace with actual user ID

// Mock authentication header (replace with actual auth token)
const AUTH_HEADER = {
  'Authorization': 'Bearer test-token',
  'Content-Type': 'application/json'
};

async function testParentIdIndexing() {
  console.log('🧪 Testing ParentId Indexing and Filtering...\n');

  try {
    // Step 1: Debug current parentId indexing
    console.log('📊 Step 1: Debugging current parentId indexing...');
    try {
      const debugResult = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/debug/parentid/${STORE_ID}`, {
        headers: AUTH_HEADER
      });
      console.log('Debug result:', debugResult.data);
    } catch (error) {
      console.log('Debug endpoint not available or failed:', error.response?.data || error.message);
    }

    // Step 2: Create a root category (no parent)
    console.log('\n📝 Step 2: Creating a root category...');
    const rootCategory = {
      name: `Root Category ${Date.now()}`,
      description: 'Root category for parentId testing',
      status: 'active',
      storeId: STORE_ID,
      userId: USER_ID
      // parentId is not set, so it will be null
    };

    const createdRootCategory = await axios.post(`${BASE_URL}/stores/${STORE_ID}/categories`, rootCategory, {
      headers: AUTH_HEADER
    });
    console.log('Created root category:', createdRootCategory.data);

    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Create a child category
    console.log('\n📝 Step 3: Creating a child category...');
    const childCategory = {
      name: `Child Category ${Date.now()}`,
      description: 'Child category for parentId testing',
      status: 'active',
      storeId: STORE_ID,
      userId: USER_ID,
      parentId: createdRootCategory.data.id
    };

    const createdChildCategory = await axios.post(`${BASE_URL}/stores/${STORE_ID}/categories`, childCategory, {
      headers: AUTH_HEADER
    });
    console.log('Created child category:', createdChildCategory.data);

    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Test filtering by parentId (root categories)
    console.log('\n🔍 Step 4: Testing filter for root categories (parentId=null)...');
    try {
      const rootCategoriesResult = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/elasticsearch?parentId=null`, {
        headers: AUTH_HEADER
      });
      console.log('Root categories search result:', rootCategoriesResult.data);
      
      const rootCategoryFound = rootCategoriesResult.data.data.find(cat => cat.id === createdRootCategory.data.id);
      console.log('Root category found in search:', !!rootCategoryFound);
    } catch (error) {
      console.log('Root categories search failed:', error.response?.data || error.message);
    }

    // Step 5: Test filtering by specific parentId
    console.log('\n🔍 Step 5: Testing filter for specific parentId...');
    try {
      const childCategoriesResult = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/elasticsearch?parentId=${createdRootCategory.data.id}`, {
        headers: AUTH_HEADER
      });
      console.log('Child categories search result:', childCategoriesResult.data);
      
      const childCategoryFound = childCategoriesResult.data.data.find(cat => cat.id === createdChildCategory.data.id);
      console.log('Child category found in search:', !!childCategoryFound);
    } catch (error) {
      console.log('Child categories search failed:', error.response?.data || error.message);
    }

    // Step 6: Test search with parentId in response
    console.log('\n🔍 Step 6: Testing general search to see parentId in results...');
    try {
      const generalSearchResult = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/elasticsearch?q=parentId`, {
        headers: AUTH_HEADER
      });
      console.log('General search result:', generalSearchResult.data);
      
      // Check if parentId is present in results
      const categoriesWithParentId = generalSearchResult.data.data.filter(cat => cat.parentId !== undefined);
      console.log('Categories with parentId field:', categoriesWithParentId.length);
      
      if (categoriesWithParentId.length > 0) {
        console.log('Sample category with parentId:', categoriesWithParentId[0]);
      }
    } catch (error) {
      console.log('General search failed:', error.response?.data || error.message);
    }

    // Step 7: Debug parentId indexing again
    console.log('\n📊 Step 7: Debugging parentId indexing after creation...');
    try {
      const debugResult2 = await axios.get(`${BASE_URL}/stores/${STORE_ID}/categories/debug/parentid/${STORE_ID}`, {
        headers: AUTH_HEADER
      });
      console.log('Debug result after creation:', debugResult2.data);
    } catch (error) {
      console.log('Debug endpoint failed:', error.response?.data || error.message);
    }

    // Step 8: Clean up - delete the test categories
    console.log('\n🗑️ Step 8: Cleaning up test categories...');
    try {
      await axios.delete(`${BASE_URL}/stores/${STORE_ID}/categories/${createdChildCategory.data.id}`, {
        headers: AUTH_HEADER
      });
      console.log('Child category deleted');
      
      await axios.delete(`${BASE_URL}/stores/${STORE_ID}/categories/${createdRootCategory.data.id}`, {
        headers: AUTH_HEADER
      });
      console.log('Root category deleted');
    } catch (error) {
      console.log('Cleanup failed:', error.response?.data || error.message);
    }

    console.log('\n✅ ParentId indexing test completed!');

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
testParentIdIndexing(); 