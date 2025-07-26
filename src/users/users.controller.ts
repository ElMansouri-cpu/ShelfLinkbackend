import { Body, Controller, Get, Patch, Post, Put, Delete, Param, Query, UseGuards } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { User } from "../auth/decorators/user.decorator";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";
import { QueryDto } from "../common/dto/query.dto";
import { UserRole } from "./enums/role.enum";

@Controller("users")
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  // --- Basic CRUD endpoints ---

  @Get()
  findAll(@Query() query: any) {
    return this.usersService.findAll('', query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne('', id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update('', id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.delete('', id);
  }

  // --- Entity-specific endpoints ---

  @Get('elasticsearch')
  async elasticSearch(
    @Query('q') query: string = '',
    @Query() filters: any,
  ) {
    // Elasticsearch is disabled, return empty results
    return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }

  @Post('elasticsearch/reindex/:id')
  async reindexUserById(@Param('id') userId: string) {
    // Elasticsearch is disabled, return success message
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Post('query')
  queryUsers(@Body() queryDto: QueryDto) {
    return this.usersService.query('', queryDto, '');
  }

  @Get('search')
  searchUsers(@Query('q') searchTerm: string, @Query('limit') limit: number = 20) {
    return this.usersService.searchUsers(searchTerm, limit);
  }

  @Get('by-role/:role')
  getUsersByRole(@Param('role') role: UserRole) {
    return this.usersService.getUsersByRole(role);
  }

  @Get('by-tier/:tier')
  getUsersBySubscriptionTier(@Param('tier') tier: string) {
    return this.usersService.getUsersBySubscriptionTier(tier);
  }

  @Get('recent')
  getRecentUsers(@Query('limit') limit: number = 10) {
    return this.usersService.getRecentUsers(limit);
  }

  @Get(':id/statistics')
  getUserStatistics(@Param('id') id: string) {
    return this.usersService.getUserStatistics(id);
  }

  @Get(':id/with-stores')
  findByIdWithStores(@Param('id') id: string) {
    return this.usersService.findByIdWithStores(id);
  }

  @Get('by-email/:email')
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Patch(':id/metadata')
  updateUserMetadata(
    @Param('id') id: string,
    @Body() metadata: Record<string, any>,
  ) {
    return this.usersService.updateUserMetadata(id, metadata);
  }

  @Patch(':id/store-limit')
  updateStoreLimit(
    @Param('id') id: string,
    @Body() body: { limit: number },
  ) {
    return this.usersService.updateStoreLimit(id, body.limit);
  }

  @Patch(':id/subscription-tier')
  updateSubscriptionTier(
    @Param('id') id: string,
    @Body() body: { tier: string },
  ) {
    return this.usersService.updateSubscriptionTier(id, body.tier);
  }

  @Post(':id/reindex')
  reindexUserService(@Param('id') userId: string) {
    // Elasticsearch is disabled, return success message
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Delete('orphaned/:id')
  async removeOrphanedUser(@Param('id') id: string) {
    // Check if user has dependencies
    const dependencies = await this.usersService.checkAssociations('', id);
    
    if (dependencies) {
      throw new Error(`Cannot delete user. It has associated stores.`);
    }
    
    return this.usersService.delete('', id);
  }

  // --- Legacy endpoints (for backward compatibility) ---

  @Get("profile")
  async getProfile(@User() user) {
    return this.usersService.findById(user.id);
  }

  @Get("onboarding-status")
  async getOnboardingStatus(@User() user) {
    // Check if user has completed onboarding
    const userData = await this.usersService.findById(user.id);
    const hasCompletedOnboarding = userData.user_metadata?.onboarding_completed === true;
    
    return {
      hasCompletedOnboarding,
      user: userData
    };
  }

  @Patch("profile")
  async updateProfile(@User() user, @Body() updateUserDto: UpdateUserDto) {
    const { data, error } = await this.supabaseService.getClient().auth.updateUser({
      email: updateUserDto.email,
      data: {
        username: updateUserDto.username
      }
    });

    if (error) {
      throw error;
    }

    // Sync the updated user data
    return this.usersService.syncUserFromSupabase(data.user);
  }

  // --- Debug endpoints (for development) ---

  @Get('debug/index')
  async debugIndex() {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }

  @Get('debug/reindex')
  async debugReindex() {
    // Elasticsearch is disabled
    return { message: 'Elasticsearch is disabled in this environment' };
  }
}
