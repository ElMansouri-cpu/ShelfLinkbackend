import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const { data: { user }, error } = await this.supabaseService.getClient().auth.getUser(token);
      
      if (error || !user) {
        throw new UnauthorizedException('Invalid token');
      }

      // Sync user with our database
      const dbUser = await this.usersService.syncUserFromSupabase(user);
      
      // Attach both the Supabase user and our database user to the request
      request.user = user;
      request.dbUser = dbUser;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
} 