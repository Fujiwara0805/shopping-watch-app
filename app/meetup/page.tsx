import { MyMeetupPage } from '@/components/meetup/my-meetup-page';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '待ち合わせノート | トクドク',
  description: 'イベントを口実に集まる「待ち合わせノート」の参加状況を確認できます。',
};

export default function MeetupHomePage() {
  return <MyMeetupPage />;
}
