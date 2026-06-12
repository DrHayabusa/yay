import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { MediaService } from './media.service';

class PresignDto {
  @IsIn(['image', 'video', 'audio', 'document'])
  category!: 'image' | 'video' | 'audio' | 'document';

  @IsString()
  @MaxLength(100)
  contentType!: string;
}

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('presign')
  presign(@CurrentUser() user: AuthUser, @Body() dto: PresignDto) {
    return this.media.presign(user.userId, dto.category, dto.contentType);
  }
}
