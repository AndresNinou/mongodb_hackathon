import { ObjectId } from "mongodb";
import { getMessagesCollection } from "./collections";
import type { Message, MessageCreate } from "@/types";

export async function getMessagesByProjectId(
  projectId: string,
  limit = 100
): Promise<Message[]> {
  const collection = await getMessagesCollection();
  const messages = await collection
    .find({ projectId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
  return messages;
}

export async function createMessage(data: MessageCreate): Promise<Message> {
  const collection = await getMessagesCollection();
  const now = new Date();

  const message: Omit<Message, "_id"> = {
    projectId: data.projectId,
    role: data.role,
    messageType: data.messageType,
    content: data.content,
    metadata: data.metadata,
    requestId: data.requestId,
    sessionId: data.sessionId,
    createdAt: now,
  };

  const result = await collection.insertOne(message as Message);

  return {
    ...message,
    _id: result.insertedId,
  } as Message;
}

export async function deleteMessagesByProjectId(projectId: string): Promise<number> {
  const collection = await getMessagesCollection();
  const result = await collection.deleteMany({ projectId });
  return result.deletedCount;
}

export async function getMessageById(messageId: string): Promise<Message | null> {
  const collection = await getMessagesCollection();
  try {
    const message = await collection.findOne({ _id: new ObjectId(messageId) });
    return message;
  } catch {
    return null;
  }
}
