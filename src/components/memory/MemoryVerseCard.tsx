import { useState } from 'react';
import { BookOpen, CalendarClock, Flame, Trash2, X } from 'lucide-react';
import { designDecorations } from '../../assets/design';
import type { MemoryVerse } from '../../types/memory';
import { sanitizeScriptureText } from '../../utils/textUtils';

type ThemeTokens = Record<string, string>;

export function MemoryVerseCard({ verse, T, index = 0, onPractice, onDelete }: { verse: MemoryVerse; T: ThemeTokens; index?: number; onPractice: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const illustrations = [
    designDecorations.openBibleFlowers,
    designDecorations.leafSprig,
    designDecorations.doveBranch,
    designDecorations.flowerBunch,
  ];
  const levelPercent = Math.min(100, (Number(verse.level || 1) / 5) * 100);
  const nextReview = new Date(verse.nextReviewAt);
  const reviewDue = !Number.isNaN(nextReview.getTime()) && nextReview.getTime() <= Date.now();
  const reviewLabel = Number.isNaN(nextReview.getTime())
    ? '복습 예정'
    : reviewDue
      ? '오늘 복습'
      : `${nextReview.getMonth() + 1}.${nextReview.getDate()} 복습`;

  const deleteVerse = () => {
    setConfirmDelete(false);
    onDelete();
  };

  return (
    <article className={`relative overflow-hidden rounded-[24px] border bg-white/95 p-4 shadow-[0_7px_18px_rgba(70,58,39,.06)] ${reviewDue ? 'border-[#C8DABF]' : 'border-[#E7DDCF]'}`}>
      <img src={illustrations[index % illustrations.length]} alt="" className="pointer-events-none absolute -bottom-3 -right-2 h-24 w-24 object-contain opacity-24" />
      <div className="relative flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onPractice}
          className="min-w-0 flex-1 touch-manipulation rounded-2xl text-left active:opacity-75"
          aria-label={`${verse.ref} 암송 연습 시작`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-black text-[#4E7F59]">{verse.ref}</h3>
            <span className={`flex min-h-7 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${reviewDue ? 'bg-[#EAF4E5] text-[#4E7F59]' : 'bg-[#FFF2D5] text-[#B67620]'}`}>
              <CalendarClock className="h-3.5 w-3.5" />
              {reviewLabel}
            </span>
          </div>
          <p className="serif-verse mt-3 line-clamp-4 text-[14px] leading-7 text-[#3D3129]">{sanitizeScriptureText(verse.text)}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EEE7DD]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#78A96C,#4E7F59)]" style={{ width: `${levelPercent}%` }} />
            </div>
            <b className="text-[10px] text-[#4E7F59]">Lv.{verse.level}</b>
          </div>
          <div className="mt-3 flex items-center gap-3 text-[10px] font-bold text-[#81786E]">
            <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-[#F08B35]" fill="currentColor" />연속 {verse.streak}회</span>
            <span>복습 {verse.reviewCount}회</span>
            <span className="text-[#4E7F59]">말씀을 눌러 연습</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label={`${verse.ref} 암송 구절 삭제`}
          className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-full border border-[#E7DDCF] bg-[#FFF9F4] text-[#A58E7D] active:opacity-70"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {confirmDelete && (
        <div className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#F0D4CA] bg-[#FFF5F1] p-3" role="alert">
          <div className="min-w-0">
            <p className="text-[12px] font-black text-[#7E493B]">이 암송 구절을 삭제할까요?</p>
            <p className="mt-0.5 truncate text-[10px] font-bold text-[#9A7167]">{verse.ref}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="grid h-10 w-10 touch-manipulation place-items-center rounded-xl border border-[#E5D7D1] bg-white text-[#7B6A62] active:opacity-70" aria-label="삭제 취소"><X className="h-4 w-4" /></button>
            <button type="button" onClick={deleteVerse} className="min-h-10 touch-manipulation rounded-xl bg-[#A95F4A] px-4 text-[11px] font-black text-white active:opacity-75">삭제</button>
          </div>
        </div>
      )}

      <button type="button" onClick={onPractice} className="relative mt-4 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-[#4E7F59] text-[13px] font-black text-white shadow-md active:opacity-85"><BookOpen className="h-4 w-4" />암송 연습하기</button>
    </article>
  );
}
