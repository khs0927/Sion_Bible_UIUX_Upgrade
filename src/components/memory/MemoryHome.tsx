import { useEffect, useMemo, useState } from 'react';
import { BellRing, Check, ChevronRight, Gift, Leaf, Plus, Sparkles, X } from 'lucide-react';
import { designDecorations } from '../../assets/design';
import { KawaiiBibleIcon, KawaiiCalendarIcon, KawaiiSavedIcon, KawaiiSettingsIcon, KawaiiVerseIcon, KawaiiWisdomIcon } from '../icons';
import type { MemoryAutoReminder, MemoryVerse, ReviewGrade } from '../../types/memory';
import {
  deleteMemoryVerse,
  getDueMemoryVerses,
  getMemoryReminderSettings,
  getMemoryVerses,
  moveMemoryVerseLevel,
  saveMemoryReviewResult,
} from '../../services/memoryStorage';
import {
  createAutoReminderSchedule,
  getDueAutoReminders,
  markAutoReminderCompleted,
  scheduleNextInAppReminder,
} from '../../services/memoryReminder';
import { MemoryPracticePage } from './MemoryPracticePage';
import { MemoryReminderSettings } from './MemoryReminderSettings';
import { MemoryVerseCard } from './MemoryVerseCard';
import { MemoryAddVerseSheet } from './MemoryAddVerseSheet';

type ThemeTokens = Record<string, string>;
type SavedVerseLike = { ref: string; text: string };
type MemoryFilter = 'all' | 'due' | 'learning' | 'mastered';

export function MemoryHome({ T, savedVerses }: { T: ThemeTokens; savedVerses: SavedVerseLike[] }) {
  const [verses, setVerses] = useState<MemoryVerse[]>([]);
  const [practiceVerseId, setPracticeVerseId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [dueAutoReminders, setDueAutoReminders] = useState<MemoryAutoReminder[]>([]);
  const [filter, setFilter] = useState<MemoryFilter>('all');

  const due = useMemo(() => getDueMemoryVerses(), [verses]);
  const masteredCount = useMemo(() => verses.filter((verse) => Number(verse.level || 0) >= 4).length, [verses]);
  const learningCount = Math.max(0, verses.length - masteredCount);
  const completedReviews = useMemo(() => verses.reduce((sum, verse) => sum + Number(verse.successCount || 0), 0), [verses]);
  const currentStreak = useMemo(() => Math.max(0, ...verses.map((verse) => Number(verse.streak || 0))), [verses]);
  const averageLevel = useMemo(() => verses.length ? verses.reduce((sum, verse) => sum + Number(verse.level || 1), 0) / verses.length : 0, [verses]);
  const activeStage = Math.min(5, Math.max(1, Number(due[0]?.level || Math.ceil(averageLevel || 1))));
  const stageLabels = ['집중 읽기', '부분 빈칸', '순서 맞추기', '전체 암송', '마음에 새기기'];

  const filteredVerses = useMemo(() => {
    if (filter === 'due') {
      const dueIds = new Set(due.map((verse) => verse.id));
      return verses.filter((verse) => dueIds.has(verse.id));
    }
    if (filter === 'mastered') return verses.filter((verse) => Number(verse.level || 0) >= 4);
    if (filter === 'learning') return verses.filter((verse) => Number(verse.level || 0) < 4);
    return verses;
  }, [due, filter, verses]);

  const refresh = () => {
    setVerses(getMemoryVerses());
    setDueAutoReminders(getDueAutoReminders());
  };

  useEffect(() => {
    refresh();
    scheduleNextInAppReminder();
  }, []);

  const practiceVerse = useMemo(() => verses.find((verse) => verse.id === practiceVerseId) || null, [verses, practiceVerseId]);

  const review = (grade: ReviewGrade) => {
    if (!practiceVerseId) return;
    const settings = getMemoryReminderSettings();
    if (settings.enabled && settings.mode === 'auto') createAutoReminderSchedule(practiceVerseId, settings.auto.preset);
    saveMemoryReviewResult(practiceVerseId, grade);
    refresh();
    setPracticeVerseId(null);
  };

  const moveStage = (delta: number) => {
    if (!practiceVerseId) return;
    moveMemoryVerseLevel(practiceVerseId, delta);
    refresh();
  };

  if (practiceVerse) {
    return <MemoryPracticePage verse={practiceVerse} T={T} onBack={() => setPracticeVerseId(null)} onMoveStage={moveStage} onFinish={() => review('good')} />;
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="relative overflow-hidden rounded-[28px] border border-[#DFE7D9] bg-[linear-gradient(135deg,#FFF9E8,#EEF7EB)] p-5 shadow-[0_12px_28px_rgba(70,58,39,.08)]">
        <img src={designDecorations.sunriseHills} alt="" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full object-cover object-bottom opacity-30" />
        <img src={designDecorations.childBible} alt="성경을 읽는 아이" className="pointer-events-none absolute -bottom-5 right-0 h-40 w-32 object-contain" />
        <div className="relative max-w-[72%]">
          <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-1 text-[11px] font-black text-[#4E7F59]"><Sparkles className="h-4 w-4" />시온성경 암송</p><span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black text-[#B67620]">{currentStreak > 0 ? `연속 ${currentStreak}일` : '오늘 시작하기'}</span></div>
          <h2 className="mt-2 text-[28px] font-black tracking-[-0.045em] text-[#2F2923]">오늘의 말씀을<br/><span className="text-[#C47C24]">마음에 새겨요</span></h2>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[#756D64]">짧게 자주 복습하며 말씀을 오래 기억할 수 있도록 도와드려요.</p>
          <button type="button" onClick={() => due[0] ? setPracticeVerseId(due[0].id) : setShowAddSheet(true)} className="mt-4 flex h-11 items-center gap-2 rounded-full bg-[#4E7F59] px-5 text-[13px] font-black text-white shadow-lg active:scale-95">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/90"><KawaiiWisdomIcon size={22} /></span>
            {due.length > 0 ? '오늘 말씀 복습하기' : '첫 구절 추가하기'}<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="rounded-[25px] border border-[#E7DDCF] bg-white/95 p-4 shadow-sm" aria-label="암송 학습 단계">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black text-[#8B8278]">현재 학습 단계</p><h3 className="mt-1 text-[19px] font-black text-[#3D3129]">{stageLabels[activeStage - 1]}</h3></div><span className="rounded-full bg-[#EEF5EB] px-3 py-1 text-[11px] font-black text-[#4E7F59]">{activeStage} / 5 단계</span></div>
        <div className="relative mt-4 flex items-start justify-between">
          <div className="absolute left-[8%] right-[8%] top-4 h-1 bg-[#E9E2D7]" aria-hidden="true"><div className="h-full bg-[#87A95A]" style={{ width: `${((activeStage - 1) / 4) * 100}%` }} /></div>
          {stageLabels.map((label, index) => { const step = index + 1; const complete = step < activeStage; const current = step === activeStage; return <div key={label} className="relative z-10 flex w-1/5 flex-col items-center gap-1 text-center"><span className={['grid h-8 w-8 place-items-center rounded-full border-2 text-[11px] font-black', complete || current ? 'border-[#87A95A] bg-[#87A95A] text-white' : 'border-[#DCCFBF] bg-[#FFFDF8] text-[#A99D8C]'].join(' ')}>{complete ? <Check className="h-4 w-4" /> : step}</span><span className={['text-[9px] font-bold leading-3', current ? 'text-[#4E7F59]' : 'text-[#8B8278]'].join(' ')}>{label}</span></div>; })}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2.5">
        <MemoryStat icon={<KawaiiBibleIcon size={30} />} value={`${verses.length}`} label="전체 구절" tone="green" />
        <MemoryStat icon={<KawaiiCalendarIcon size={30} />} value={`${due.length}`} label="오늘 복습" tone="gold" />
        <MemoryStat icon={<KawaiiSavedIcon size={30} />} value={`${masteredCount}`} label="암송 완료" tone="purple" />
      </section>

      <section className="relative overflow-hidden rounded-[25px] border border-[#F0D6B6] bg-[linear-gradient(135deg,#FFF9E8,#FFF1D2)] p-4 shadow-sm" aria-label="오늘의 보상">
        <div className="relative flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/80 text-[#E99B31]"><Gift className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-black text-[#B67620]">오늘의 보상</p><h3 className="mt-1 text-[17px] font-black text-[#3D3129]">말씀을 마음에 새기면 꿀송이와 포인트를 받아요</h3><p className="mt-1 text-[10px] font-semibold text-[#81786E]">복습 완료 {completedReviews}회 · 오늘 복습 {due.length}개</p></div><span className="shrink-0 text-right"><b className="block text-[18px] text-[#B67620]">+10</b><small className="text-[9px] font-black text-[#81786E]">꿀송이</small></span></div>
      </section>

      {dueAutoReminders.length > 0 && (
        <section className="rounded-[22px] border border-[#F0D6B6] bg-[#FFF5DF] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#E58E28]"><BellRing className="h-5 w-5 animate-bounce" /></span><div><h3 className="text-[13px] font-black">복습 알림이 도착했어요</h3><p className="mt-1 text-[10px] font-semibold text-[#7D7163]">{dueAutoReminders.length}개의 말씀을 다시 떠올려보세요.</p></div></div>
            <button type="button" onClick={() => { markAutoReminderCompleted(dueAutoReminders[0].id); refresh(); }} className="rounded-full bg-[#E99B31] px-4 py-2 text-[11px] font-black text-white">확인</button>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden rounded-[25px] border border-[#E6DCCE] bg-white/95 p-4 shadow-sm">
        <img src={designDecorations.bookmarks} alt="" className="pointer-events-none absolute -right-2 -top-1 h-20 w-20 object-contain opacity-55" />
        <div className="relative flex items-start justify-between gap-3">
          <div><p className="flex items-center gap-1 text-[11px] font-black text-[#4E7F59]"><KawaiiVerseIcon size={18} />오늘 복습할 말씀</p><h3 className="mt-1 text-[22px] font-black">{due.length > 0 ? `${due.length}개의 말씀이 기다려요` : '오늘 복습을 모두 마쳤어요'}</h3><p className="mt-1 text-[11px] font-semibold text-[#81786E]">학습 중 {learningCount}개 · 암송 완료 {masteredCount}개</p></div>
        </div>
        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-[#ECE7DE]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#75A969,#4E7F59)]" style={{ width: `${verses.length ? Math.max(4, (masteredCount / verses.length) * 100) : 4}%` }} /></div>
        <div className="relative mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => setShowAddSheet(true)} className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#DDE4D7] bg-[#F4F8F1] text-[12px] font-black text-[#4E7F59]"><span className="grid h-7 w-7 place-items-center rounded-full bg-white"><Plus className="h-4 w-4" /></span>구절 추가</button>
          <button type="button" onClick={() => setShowReminderSheet(true)} className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#E7DDCF] bg-[#FFF9EF] text-[12px] font-black text-[#766A5C]"><KawaiiSettingsIcon size={24} />알림 설정</button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between px-1"><div><h3 className="flex items-center gap-2 text-[21px] font-black"><KawaiiSavedIcon size={27} />암송 목록</h3><p className="mt-1 text-[10px] font-semibold text-[#8B8278]">말씀 카드를 눌러 복습을 시작하세요.</p></div><span className="rounded-full bg-[#EEF5EB] px-3 py-1 text-[10px] font-black text-[#4E7F59]">총 {verses.length}개</span></div>
        <div className="mt-3 grid grid-cols-4 rounded-full border border-[#E4D8CA] bg-[#F8F1E7] p-1">{([
          ['all', '전체'], ['due', '오늘'], ['learning', '학습 중'], ['mastered', '완료'],
        ] as Array<[MemoryFilter, string]>).map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={['h-9 rounded-full text-[10px] font-black', filter === value ? 'bg-[#4E7F59] text-white shadow-sm' : 'text-[#746B62]'].join(' ')}>{label}</button>)}</div>

        {filteredVerses.length === 0 ? (
          <div className="mt-3 rounded-[24px] border-2 border-dashed border-[#E2D8CA] bg-white/70 px-5 py-10 text-center"><img src={designDecorations.childResting} alt="" className="mx-auto h-28 w-28 object-contain" /><h4 className="mt-3 text-[17px] font-black">표시할 암송 구절이 없습니다</h4><p className="mt-1 text-[11px] font-semibold text-[#81786E]">저장한 말씀이나 직접 찾은 말씀을 추가해보세요.</p><button type="button" onClick={() => setShowAddSheet(true)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F4A23A] px-5 py-2.5 text-[12px] font-black text-white"><Plus className="h-4 w-4" />구절 추가하기</button></div>
        ) : (
          <div className="mt-3 grid gap-3">{filteredVerses.map((verse, index) => <MemoryVerseCard key={verse.id} verse={verse} T={T} index={index} onPractice={() => setPracticeVerseId(verse.id)} onDelete={() => { deleteMemoryVerse(verse.id); refresh(); }} />)}</div>
        )}
      </section>

      <section className="relative overflow-hidden rounded-[23px] border border-[#DFE8D8] bg-[#F1F7EE] p-4" aria-label="성장 정원">
        <div className="relative z-10"><div className="flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-[18px] font-black text-[#4E7F59]"><Leaf className="h-5 w-5" />은혜 성장 정원</h3><p className="mt-1 text-[11px] font-semibold text-[#756D64]">말씀이 마음에 뿌리내려 아름답게 자라고 있어요.</p></div><span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black text-[#4E7F59]">{Math.round((masteredCount / Math.max(1, verses.length)) * 100)}% 성장</span></div><div className="mt-4 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((slot) => { const grown = slot < Math.min(4, masteredCount); return <div key={slot} className="flex min-h-[92px] flex-col items-center justify-end rounded-2xl border border-[#DDE8D8] bg-white/65 p-2 text-center"><img src={grown ? designDecorations.flowerPot : designDecorations.pottedSprout} alt={grown ? '성장한 말씀 꽃' : '자라는 말씀 새싹'} className="h-14 w-14 object-contain" /><span className="mt-1 text-[9px] font-black text-[#5E7652]">{grown ? '잘 자라고 있어요' : '새 말씀 심기'}</span></div>; })}</div></div><img src={designDecorations.homeCross} alt="성경과 십자가" className="pointer-events-none absolute -bottom-3 -right-2 h-24 w-24 object-contain opacity-45" /></section>

      {showReminderSheet && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm">
          <section className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-[#E7DDCF] bg-[#FFFDF8] shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E7DDCF] bg-[#FFFDF8]/95 p-5 backdrop-blur-xl"><div className="flex items-center gap-3"><KawaiiSettingsIcon size={28} /><h2 className="text-[20px] font-black">암송 알림 설정</h2></div><button type="button" onClick={() => { setShowReminderSheet(false); refresh(); }} className="grid h-10 w-10 place-items-center rounded-full bg-[#F3EEE6]"><X className="h-5 w-5" /></button></header>
            <div className="p-5 pb-10"><MemoryReminderSettings T={T} /></div>
          </section>
        </div>
      )}

      {showAddSheet && <MemoryAddVerseSheet onClose={() => { setShowAddSheet(false); refresh(); }} savedVerses={savedVerses} theme={T} fontSize="1rem" />}
    </div>
  );
}

function MemoryStat({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: 'green' | 'gold' | 'purple' }) {
  const backgrounds = { green: '#EEF6EB', gold: '#FFF5DD', purple: '#F3EFFA' };
  return <section className="rounded-[20px] border border-[#E7DDCF] p-3 text-center shadow-sm" style={{ background: backgrounds[tone] }}><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white/80">{icon}</span><b className="mt-2 block text-[19px]">{value}</b><small className="mt-0.5 block text-[9px] font-bold text-[#81786E]">{label}</small></section>;
}
