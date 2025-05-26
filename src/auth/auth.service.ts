import { Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async signIn(phone: string) {
    const { data, error } = await this.supabaseService.getClient().auth.signInWithOtp({
      phone,
    });
    if (error) throw new UnauthorizedException(error.message);
    return data;
  }

  async verifyOtp(phone: string, token: string) {
    const { data, error } = await this.supabaseService.getClient().auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    });

    if (error) throw new UnauthorizedException(error.message);

    return data;
  }

  async refreshToken(refreshToken: string) {
    const { data, error } = await this.supabaseService.getClient().auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) throw new UnauthorizedException(error.message);

    return data;
  }
}
