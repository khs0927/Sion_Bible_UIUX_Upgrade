import { useState } from 'react';
import { X } from 'lucide-react';
import { BibleVersePicker } from '../bible/BibleVersePicker';
import { BibleKeywordSearch } from '../bible/BibleKeywordSearch';
import { BIBLE_BOOKS, type BibleBook } from '../../data/bibleBooks';
import { addMemoryVerse, isVerseMemorized } from '../../services/memoryStorage';
import confetti from 'canvas-confetti';

import { formatReference } from '../../services/bibleSearch';

interface MemoryAddVerseSheetProps {
  onClose: () => void;
  savedVerses: { ref: string; text: string }[];
  theme: any;
  fontSize: string;
}

type Tab = 'picker' | 'search' | 'saved';
type PickerLocation = { book: BibleBook; chapter: number };

const MEMORY_ADD_TAB_KEY = 'sion_memory_add_tab';
const MEMORY_PICKER_LOCATION_KEY = 'sion_memory_picker_location';

function readInitialTab(): Tab {
  if (typeof window === 'undefined') return 'picker';
  try {
    const saved = window.localStorage.getItem(MEMORY_ADD_TAB_KEY);
    if (saved === 'picker' || saved === 'search' || saved === 'saved') return saved;
  } catch {
    // 저장값을 읽을 수 없으면 기본 탭을 사용합니다.
  }
  return 'picker';
}

function readInitialPickerLocation(): PickerLocation {
  const fallbackBook = BIBLE_BOOKS[42] || BIBLE_BOOKS[0];
  const fallback = { book: fallbackBook, chapter: Math.min(3, fallbackBook.chapters) };
  if (typeof window === 'undefined') return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(MEMORY_PICKER_LOCATION_KEY) || '{}') as { bookId?: string; chapter?: number };
    const book = BIBLE_BOOKS.find((item) => item.id === parsed.bookId);
    if (!book) return fallback;
    const chapter = Math.max(1, Math.min(book.chapters, Number(parsed.chapter) || 1));
    return { book, chapter };
  } catch {
    return fallback;
  }
}

export function MemoryAddVerseSheet({
  onClose,
  savedVerses,
  theme,
  fontSize,
}: MemoryAddVerseSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>(() => readInitialTab());
  const [initialPickerLocation] = useState<PickerLocation>(() => readInitialPickerLocation());
  const [selectedList, setSelectedList] = useState<{ ref: string; text: string; verses?: any[] }[]>([]);
  const [feedback, setFeedback] = useState('');

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedList([]);
    setFeedback('');
    try {
      window.localStorage.setItem(MEMORY_ADD_TAB_KEY, tab);
    } catch {
      // 탭 저장 실패는 화면 사용에 영향을 주지 않습니다.
    }
  };

  const handleToggleSelection = (items: any) => {
    setFeedback('');
    if (activeTab === 'picker') {
      const data = items as { bookId: string; bookName: string; chapter: number; verses: { verse: number; text: string }[] };
      try {
        window.localStorage.setItem(MEMORY_PICKER_LOCATION_KEY, JSON.stringify({ bookId: data.bookId, chapter: data.chapter }));
      } catch {
        // 마지막 위치 저장 실패는 선택 동작에 영향을 주지 않습니다.
      }

      if (data.verses.length === 0) {
        setSelectedList([]);
        return;
      }

      const ref = formatReference(data.bookName, data.chapter, data.verses.map(v => v.verse));
      const combinedText = data.verses.map(v => v.text).join(' ');

      setSelectedList([{
        ref,
        text: combinedText,
        verses: data.verses.map(v => ({ ...v, bookId: data.bookId, bookName: data.bookName, chapter: data.chapter })),
      }]);
    } else {
      const item = items[0];
      if (!item) return;

      const exists = selectedList.find(i => i.ref === item.ref);
      if (exists) {
        setSelectedList(selectedList.filter(i => i.ref !== item.ref));
      } else {
        setSelectedList([...selectedList, item]);
      }
    }
  };

  const handleAdd = () => {
    if (selectedList.length === 0) return;

    let addedCount = 0;
    selectedList.forEach(v => {
      if (!isVerseMemorized(v.ref, v.text)) {
        addMemoryVerse({
          ref: v.ref,
          text: v.text,
          source: activeTab === 'picker' ? 'bible-picker' :
                  activeTab === 'search' ? 'keyword-search' : 'saved',
        } as any);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.8 } });
      onClose();
    } else {
      setFeedback('이미 암송 목록에 있는 말씀입니다. 다른 말씀을 선택해 주세요.');
    }
  };

  return (
    <div className="fixed inset-0 flex items-end" style={{ zIndex: 1000 }}>
      <button type="button" aria-label="암송 구절 추가 닫기" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[98dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-[22px] border-t bg-[#FDF6F0] shadow-2xl" style={{ borderColor: theme.line }}>
        <div className="mx-auto my-2 h-1 w-10 flex-shrink-0 rounded-full bg-gray-300/40" />

        <header className="flex flex-shrink-0 items-center justify-between px-4 pb-2">
          <div>
            <h2 className="title-font text-xl font-black" style={{ color: theme.text }}>암송 구절 추가</h2>
            <p className="mt-0.5 text-[10px] font-bold" style={{ color: theme.sub }}>마지막으로 사용한 방법과 본문 위치를 기억합니다.</p>
          </div>
          <button aria-label="암송 구절 추가 닫기" onClick={onClose} className="grid h-11 w-11 touch-manipulation place-items-center rounded-full bg-black/5 active:opacity-70">
            <X size={22} style={{ color: theme.text }} />
          </button>
        </header>

        <nav className="no-scrollbar mb-2 flex flex-shrink-0 gap-2 overflow-x-auto px-4" aria-label="암송 구절 추가 방법">
          {(['picker', 'search', 'saved'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => changeTab(tab)}
              className={`min-h-11 touch-manipulation whitespace-nowrap rounded-[14px] border px-4 py-2.5 text-xs font-black active:opacity-75 ${activeTab === tab ? 'shadow-sm text-white' : 'bg-white'}`}
              style={{
                background: activeTab === tab ? theme.accent : 'white',
                borderColor: activeTab === tab ? theme.accent : theme.line,
                color: activeTab === tab ? 'white' : theme.sub,
              }}
              aria-pressed={activeTab === tab}
            >
              {tab === 'picker' ? '본문에서 선택' :
               tab === 'search' ? '단어로 검색' : '저장된 말씀'}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          {activeTab === 'picker' && (
            <div className="rounded-[18px] border bg-white p-3 shadow-sm" style={{ borderColor: theme.line }}>
              <BibleVersePicker
                mode="select"
                initialBook={initialPickerLocation.book}
                initialChapter={initialPickerLocation.chapter}
                onSelectVerses={handleToggleSelection}
                fontSize={fontSize}
              />
            </div>
          )}

          {activeTab === 'search' && (
            <BibleKeywordSearch
              onSelectVerses={handleToggleSelection}
              selectedRefs={selectedList.map(i => i.ref)}
            />
          )}

          {activeTab === 'saved' && (
            <div className="space-y-3">
              {savedVerses.length === 0 ? (
                <div className="rounded-[20px] border-2 border-dashed py-16 text-center" style={{ borderColor: theme.line, color: theme.sub }}>
                  <p className="text-sm font-black">저장된 말씀이 없습니다.</p>
                  <p className="mt-1 text-xs font-bold">먼저 말씀을 북마크한 뒤 다시 확인해 보세요.</p>
                </div>
              ) : (
                savedVerses.map(v => {
                  const isSelected = selectedList.find(i => i.ref === v.ref);
                  return (
                    <button
                      key={v.ref}
                      onClick={() => handleToggleSelection([v])}
                      className={`w-full touch-manipulation rounded-[16px] border px-4 py-3 text-left active:opacity-75 ${isSelected ? 'border-2 shadow-md' : 'bg-white'}`}
                      style={{
                        borderColor: isSelected ? theme.accent : theme.line,
                        background: isSelected ? `${theme.accent}08` : 'white',
                      }}
                      aria-pressed={Boolean(isSelected)}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="title-font text-sm font-black" style={{ color: theme.accent }}>{v.ref}</span>
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: isSelected ? theme.accent : theme.line }}>
                          {isSelected && <div className="h-3 w-3 rounded-full" style={{ background: theme.accent }} />}
                        </div>
                      </div>
                      <p className="serif-verse text-sm leading-relaxed" style={{ color: theme.text }}>{v.text}</p>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </main>

        <footer
          className="relative z-10 flex-shrink-0 border-t bg-white px-4 pt-3 shadow-[0_-10px_24px_rgba(61,49,41,0.06)]"
          style={{
            borderColor: theme.line,
            paddingBottom: `calc(12px + env(safe-area-inset-bottom))`,
          }}
        >
          {feedback && (
            <div className="mb-2 rounded-xl border border-[#F0D6B6] bg-[#FFF7E8] px-3 py-2 text-xs font-black text-[#9A6425]" role="status" aria-live="polite">
              {feedback}
            </div>
          )}
          {selectedList.length > 0 && (
            <div className="mb-2 truncate text-xs font-bold" style={{ color: theme.sub }}>
              선택됨: {selectedList.map(item => item.ref).join(', ')}
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={selectedList.length === 0}
            className="min-h-[50px] w-full touch-manipulation rounded-[16px] text-sm font-black shadow-xl disabled:opacity-40 disabled:grayscale active:opacity-85"
            style={{ background: theme.peach, color: theme.text }}
          >
            {selectedList.length > 0
              ? `${selectedList.length}개의 말씀 암송 추가하기`
              : '말씀을 선택해 주세요'}
          </button>
        </footer>
      </div>
    </div>
  );
}
