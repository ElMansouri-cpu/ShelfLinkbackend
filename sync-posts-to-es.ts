import { createClient } from '@supabase/supabase-js';
import { Client as ESClient } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY! // Make sure this is the service role key
);

const es = new ESClient({ node: 'http://localhost:9200' });

// Flatten variant data for Elasticsearch
async function flattenVariant(variant: any) {
    return {
      id: variant.id,
      name: variant.name,
      barcode: variant.barcode,
      description: variant.description,
      storeId: variant.store_id,
  
      store: variant.store ? {
        id: variant.store.id,
        name: variant.store.name,
        logo: variant.store.logo,
        banner: variant.store.banner,
        url: variant.store.url,
        description: variant.store.description,
        location: variant.store.location,
        isPrimary: variant.store.is_primary,
        productsCount: variant.store.products_count,
        ordersCount: variant.store.orders_count
      } : null,
  
      image: variant.image,
  
      brand: variant.brand ? {
        id: variant.brand.id,
        name: variant.brand.name,
        image: variant.brand.image
      } : null,
  
      category: variant.category ? {
        id: variant.category.id,
        name: variant.category.name,
        image: variant.category.image
      } : null,
  
      provider: variant.provider ? {
        id: variant.provider.id,
        name: variant.provider.name
      } : null,
  
      unit: variant.unit ? {
        id: variant.unit.id,
        name: variant.unit.name
      } : null,
  
      prices: {
        buy: {
          ht: variant.buy_price_ht,
          discountPct: variant.buy_discount_pct,
          netHt: variant.buy_price_net_ht,
          ttc: variant.buy_price_ttc
        },
        sell: {
          ht: variant.sell_price_ht,
          ttc: variant.sell_price_ttc,
          margePct: variant.marge_pct,
          margeType: variant.marge_type
        }
      },
  
      taxes: variant.taxes?.map((tax: any) => ({
        id: tax.id,
        name: tax.name,
        rate: tax.rate
      })) || []
    };
  }
  

async function syncVariants() {
  // Adjust the 'select' with relations if you have them in Supabase (use dot notation for foreign keys)
  const { data: variants, error } = await supabase
    .from('variants')
    .select(`
      *,
      store:stores(*),
      brand:brands(*),
      category:categories(*),
      provider:providers(*),
      unit:units(*),
      taxes:variant_taxes(*)
    `);

  if (error) {
    console.error('Error fetching from Supabase:', error);
    return;
  }

  const indexExists = await es.indices.exists({ index: 'variants' });
  if (!indexExists) {
    await es.indices.create({
      index: 'variants',
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: { 
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256
                }
              }
            },
            barcode: { type: 'keyword' },
            description: { type: 'text' },
            storeId: { type: 'keyword' },
            store: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
                logo: { type: 'text' },
                banner: { type: 'text' },
                url: { type: 'text' },
                description: { type: 'text' },
                location: {
                  properties: {
                    lat: { type: 'float' },
                    lng: { type: 'float' },
                    address: { type: 'text' }
                  }
                },
                isPrimary: { type: 'boolean' },
                productsCount: { type: 'integer' },
                ordersCount: { type: 'integer' },
              }
            },

            brand: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' }
              }
            },
            category: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' }
              }
            },
            provider: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' }
              }
            },
            unit: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' }
              }
            },

            prices: {
              properties: {
                buy: {
                  properties: {
                    ht: { type: 'float' },
                    discountPct: { type: 'float' },
                    netHt: { type: 'float' },
                    ttc: { type: 'float' }
                  }
                },
                sell: {
                  properties: {
                    ht: { type: 'float' },
                    ttc: { type: 'float' },
                    margePct: { type: 'float' },
                    margeType: { type: 'keyword' }
                  }
                }
              }
            },

            taxes: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
                rate: { type: 'float' }
              }
            }
          }
        }
      }
    });
  }

  for (const variant of variants) {
    const doc = await flattenVariant(variant);
    try {
      await es.index({
        index: 'variants',
        id: doc.id.toString(),
        document: doc,
      });
      console.log(`Indexed variant ${doc.id}`);
    } catch (err) {
      console.error(`Failed to index variant ${doc.id}:`, err);
    }
  }

  console.log('✅ All variants synced to Elasticsearch.');
}

syncVariants();
