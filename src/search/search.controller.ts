import { Controller, Get, Query, Param, Post, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { User as UserDec } from '../auth/decorators/user.decorator';
import { SearchManagerService } from '../elasticsearch/services/search-manager.service';

@Controller('stores/:storeId/search')
@UseGuards(SupabaseAuthGuard)
export class SearchController {
  constructor(private readonly searchManagerService: SearchManagerService) {}

  @Get('global')
  async globalSearch(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
    @UserDec() user: any,
  ) {
    return this.searchManagerService.globalSearch(storeId, query, limit);
  }

  @Post('reindex')
  async reindexStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @UserDec() user: any,
  ) {
    await this.searchManagerService.reindexStore(storeId);
    return { message: 'Store reindexing completed' };
  }
} 