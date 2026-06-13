import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileContextDbService } from './file-context-db.service';
import { CONTEXT_DB } from '@ai-orchestrator/core-interfaces';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CONTEXT_DB,
      useClass: FileContextDbService,
    },
  ],
  exports: [CONTEXT_DB],
})
export class FileContextDbModule {}