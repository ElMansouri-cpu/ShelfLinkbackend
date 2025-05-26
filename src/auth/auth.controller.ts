import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signin")
  async signIn(@Body("phone") phone: string) {
    return this.authService.signIn(phone);
  }

  @Post("verify")
  async verifyOtp(@Body("phone") phone: string, @Body("token") token: string) {
    return this.authService.verifyOtp(phone, token);
  }

  @Post("refresh")
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }
}
