import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { ChatMessageDTO } from '@ridy/database';

@Resolver()
export class ChatResolver {
  constructor(private readonly chatService: ChatService) {}

  @Mutation(() => ChatMessageDTO)
  async sendChatMessage(
    @Args('orderId', { type: () => ID }) orderId: number,
    @Args('message') message: string,
  ): Promise<ChatMessageDTO> {
    return this.chatService.sendMessage({
      requestId: orderId,
      content: message,
    });
  }

  @Mutation(() => Boolean)
  async updateLastSeenMessagesAt(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<boolean> {
    return await this.chatService.updateLastSeenMessagesAt(orderId);
  }
}
