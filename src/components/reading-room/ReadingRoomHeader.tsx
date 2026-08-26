import { BookOpenCheck, ClipboardList, Gift, History, Leaf } from 'lucide-react';

type ReadingRoomHeaderProps = {
  onExit: () => void;
  onOpenBible: () => void;
};

function getHeaderMeta() {
  if (typeof window === 'undefined') return { title: '통독', icon: ClipboardList, subpage: false };
  const path = window.location.pathname;
  if (path.startsWith('/reading-room/course-complete')) return { title: '통독 완료', icon: ClipboardList, subpage: true };
  if (path.startsWith('/reading-room/course-detail')) return { title: '코스 상세', icon: Leaf, subpage: true };
  if (path.startsWith('/reading-room/mission')) return { title: '오늘의 미션', icon: BookOpenCheck, subpage: true };
  if (path.startsWith('/reading-room/courses')) return { title: '코스', icon: Leaf, subpage: false };
  if (path.startsWith('/reading-room/my-courses')) return { title: '나의 코스', icon: ClipboardList, subpage: false };
  if (path.startsWith('/reading-room/records')) return { title: '읽기 기록', icon: History, subpage: false };
  if (path.startsWith('/reading-room/rewards')) return { title: '보상', icon: Gift, subpage: false };
  return { title: '통독', icon: ClipboardList, subpage: false };
}

function navigate(path: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

export function ReadingRoomHeader({ onExit, onOpenBible }: ReadingRoomHeaderProps) {
  const meta = getHeaderMeta();
  const HeaderIcon = meta.icon;
  if (meta.subpage) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-[#EDE3D5]/80 bg-[#FBF7EF]/94 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-xl sm:px-5">
      <div className="flex min-h-12 items-center justify-between gap-2">
        <button type="button" onClick={onExit} aria-label="통독방 홈으로 나가기" className="flex min-w-0 touch-manipulation items-center gap-3 rounded-2xl text-left active:opacity-75">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[#E6DDCF] bg-white text-[#4E7F59] shadow-[0_4px_12px_rgba(80,65,42,.06)]">
            <HeaderIcon className="h-[23px] w-[23px]" strokeWidth={2} />
          </span>
          <span className="min-w-0">
            {meta.title === '통독' && <span className="block text-[10px] font-bold leading-none text-[#81786E]">시온성경</span>}
            <span className="mt-1 block truncate text-[21px] font-black leading-none tracking-[-.03em] text-[#28231F]">{meta.title}</span>
          </span>
        </button>

        <nav aria-label="통독 빠른 메뉴" className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => navigate('/reading-room/records')} aria-label="읽기 기록 열기" title="읽기 기록" className="grid h-11 w-11 touch-manipulation place-items-center rounded-full text-[#3D3934] active:bg-black/5 active:opacity-70">
            <History className="h-[21px] w-[21px]" strokeWidth={1.9} />
          </button>
          <button type="button" onClick={() => navigate('/reading-room/rewards')} aria-label="통독 보상 열기" title="보상" className="grid h-11 w-11 touch-manipulation place-items-center rounded-full text-[#3D3934] active:bg-black/5 active:opacity-70">
            <Gift className="h-[21px] w-[21px]" strokeWidth={1.9} />
          </button>
          <button type="button" onClick={onOpenBible} aria-label="성경 본문 열기" title="성경 본문" className="grid h-11 w-11 touch-manipulation place-items-center rounded-full border border-[#D8E2D4] bg-[#F7FBF5] text-[#4E7F59] active:opacity-70">
            <BookOpenCheck className="h-[20px] w-[20px]" strokeWidth={2} />
          </button>
        </nav>
      </div>
    </header>
  );
}
