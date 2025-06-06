import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { validateConfig } from './configuration';
import { AppConfigService } from './config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
      validationOptions: {
        abortEarly: false,
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {} 