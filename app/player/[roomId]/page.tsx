import { PlayerScreen } from "./PlayerScreen";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default async function PlayerPage({ params }: Props) {
  const { roomId } = await params;
  return <PlayerScreen roomId={roomId} />;
}
