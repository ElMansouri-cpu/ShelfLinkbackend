import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { OnboardingDto } from './dto/onboarding.dto';

@Controller('onboarding')
@UseGuards(SupabaseAuthGuard)
export class OnboardingController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Post()
  async completeOnboarding(@User() user, @Body() onboardingDto: OnboardingDto) {
    // Update user profile in Supabase
    const { data, error } = await this.supabaseService.getClient().auth.updateUser({
      email: onboardingDto.email,
      data: {
        username: onboardingDto.username,
        onboarding_completed: true
      }
    });

    if (error) {
      throw error;
    }

    // You can also create additional user data in your database here
    // For example, creating a user profile record

    return {
      success: true,
      user: data.user
    };
  }
} 