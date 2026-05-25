import { MasterPanel } from "./MasterPanel";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default async function MasterPage({ params }: Props) {
  const { roomId } = await params;
  return <MasterPanel roomId={roomId} />;
}
