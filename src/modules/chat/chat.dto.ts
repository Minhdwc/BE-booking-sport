import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateChatConversationDto {
  @IsString()
  @IsNotEmpty()
  venueId: string;
}

export class SendChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
