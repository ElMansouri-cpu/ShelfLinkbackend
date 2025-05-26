import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { User } from "../auth/decorators/user.decorator";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get("profile")
  async getProfile(@User() user) {
    return user;
  }

  @Get("onboarding-status")
  async getOnboardingStatus(@User() user) {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = user.user_metadata?.onboarding_completed === true;
    
    return {
      hasCompletedOnboarding,
      user
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

    return data.user;
  }
}
