import { MeetupChatClient } from '@/components/meetup/meetup-chat-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { roomId: string };
}

export default function MeetupRoomPage({ params }: PageProps) {
  return <MeetupChatClient roomId={params.roomId} />;
}
