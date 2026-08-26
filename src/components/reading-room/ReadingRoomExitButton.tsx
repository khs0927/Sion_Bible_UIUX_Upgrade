import { DoorOpen } from 'lucide-react';

type ReadingRoomExitButtonProps = {
  onExit: () => void;
};

export function ReadingRoomExitButton({ onExit }: ReadingRoomExitButtonProps) {
  return (
    <button
      type="button"
      aria-label="통독방 나가기"
      onClick={onExit}
      className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-[#DCCFBC] bg-white px-3 text-[12px] font-bold text-[#4E7F59] shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:opacity-75 max-[340px]:px-2.5"
    >
      <DoorOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="hidden min-[390px]:inline">통독방 나가기</span>
      <span className="hidden max-[389px]:inline max-[339px]:hidden">나가기</span>
    </button>
  );
}
