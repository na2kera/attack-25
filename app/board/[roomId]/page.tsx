import { BoardDisplay } from "./BoardDisplay";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default async function BoardPage({ params }: Props) {
  const { roomId } = await params;
  return <BoardDisplay roomId={roomId} />;
}
