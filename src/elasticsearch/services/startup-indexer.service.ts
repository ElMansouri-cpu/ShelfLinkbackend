import { Injectable, OnModuleInit } from '@nestjs/common';
import { SearchManagerService } from './search-manager.service';
import { StoresService } from 'src/stores/stores.service';

@Injectable()
export class StartupIndexerService implements OnModuleInit {
  constructor(
    private readonly searchManagerService: SearchManagerService,
    private readonly storesService: StoresService,
  ) {}

  async onModuleInit() {
    try {
      console.log('Starting automatic indexing of all stores...');
      const stores = await this.storesService.getAllStores();
      
      for (const store of stores) {
        try {
          console.log(`Indexing store: ${store.name} (${store.id})`);
          await this.searchManagerService.reindexStore(store.id);
          console.log(`Successfully indexed store: ${store.name}`);
        } catch (error) {
          console.error(`Failed to index store ${store.name}:`, error);
        }
      }
      
      console.log('Automatic indexing completed');
    } catch (error) {
      console.error('Failed to perform automatic indexing:', error);
    }
  }
} 