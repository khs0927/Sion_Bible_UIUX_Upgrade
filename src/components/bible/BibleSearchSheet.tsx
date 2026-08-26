import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent, type UIEvent as ReactUIEvent } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, BookmarkCheck, BookOpen, Copy, Layers3, Loader2, Search, X } from 'lucide-react';
import { searchBibleVerses } from '../../services/bibleSearch';
import { aiSearchBibleVerses, type AiBibleSearchMeta, type AiBibleSearchSection } from '../../services/aiBibleSearch';
import type { BibleVerseRecord } from '../../types/bible';
import { sanitizeScriptureText } from '../../utils/textUtils';

interface BibleSearchSheetProps {
  onClose: () => void;
  onNavigate: (verse: BibleVerseRecord) => void;
  onCopy: (verse: BibleVerseRecord) => void;
  onToggleSave: (verse: BibleVerseRecord) => void;
  isSaved: (ref: string) => boolean;
  T: Record<string, string>;
  fontSize?: string;
}

const LIMIT = 50;
const VERSE_ONLY_SCROLL_TOP = 24;
const STORAGE_KEY = 'sion_bible_search_sheet_state';

type StoredSearch = {
  query?: string;
  questionMode?: boolean;
  scrollTop?: number;
};

function readStoredSearch(): StoredSearch {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as StoredSearch & { aiMode?: boolean };
    return {
      query: parsed.query,
      questionMode: parsed.questionMode ?? parsed.aiMode ?? false,
      scrollTop: parsed.scrollTop,
    };
  } catch {
    return {};
  }
}

function writeStoredSearch(value: StoredSearch) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 저장 실패는 검색 동작에 영향을 주지 않습니다.
  }
}

export function BibleSearchSheet({ onClose, onNavigate, onCopy, onToggleSave, isSaved, T, fontSize = '0.875rem' }: BibleSearchSheetProps) {
  const [initialStored] = useState<StoredSearch>(() => readStoredSearch());
  const [query, setQuery] = useState(initialStored.query || '');
  const [questionMode, setQuestionMode] = useState(Boolean(initialStored.questionMode));
  const [results, setResults] = useState<BibleVerseRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchMeta, setSearchMeta] = useState<AiBibleSearchMeta | null>(null);
  const [verseOnly, setVerseOnly] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startYRef = useRef<number | null>(null);
  const startTopRef = useRef(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const setViewportHeight = () => document.documentElement.style.setProperty('--sion-search-page-vh', `${window.innerHeight * 0.01}px`);
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    setViewportHeight();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    writeStoredSearch({ query, questionMode, scrollTop: 0 });
  }, [query, questionMode]);

  useEffect(() => {
    if (questionMode) return;
    const trimmed = query.trim();
    const timer = window.setTimeout(() => {
      if (trimmed.length >= 2) void searchNow(true);
      else resetResults();
    }, 380);
    return () => window.clearTimeout(timer);
  }, [query, questionMode]);

  const sectionByVerseId = useMemo(() => {
    const map = new Map<string, AiBibleSearchSection>();
    if (!questionMode || !searchMeta?.sections) return map;
    searchMeta.sections.forEach((section) => {
      section.verseIds.forEach((verseId) => {
        if (!map.has(verseId)) map.set(verseId, section);
      });
    });
    return map;
  }, [questionMode, searchMeta]);

  const persist = () => {
    writeStoredSearch({ query, questionMode, scrollTop: 0 });
  };

  const close = () => {
    persist();
    onClose();
  };

  const resetResults = () => {
    requestIdRef.current += 1;
    setLoading(false);
    setResults([]);
    setTotalCount(0);
    setHasMore(false);
    setOffset(0);
    setSearchMeta(null);
    setError('');
    setVerseOnly(false);
    mainRef.current?.scrollTo({ top: 0 });
  };

  const searchNow = async (reset = false) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const nextOffset = reset ? 0 : offset + LIMIT;
    setLoading(true);
    setError('');

    try {
      const response = questionMode
        ? await aiSearchBibleVerses(trimmed, { limit: LIMIT, offset: nextOffset })
        : await searchBibleVerses(trimmed, { limit: LIMIT, offset: nextOffset });
      if (requestId !== requestIdRef.current) return;

      setResults(reset ? response.items : (previous) => [...previous, ...response.items]);
      setTotalCount(response.totalCount);
      setHasMore(response.hasMore);
      setOffset(nextOffset);
      setSearchMeta(questionMode && 'meta' in response ? response.meta as AiBibleSearchMeta : null);

      if (reset) {
        mainRef.current?.scrollTo({ top: 0 });
        setVerseOnly(false);
      }
    } catch (searchError) {
      if (requestId !== requestIdRef.current) return;
      console.error('Search failed:', searchError);
      setError('검색을 완료하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const switchMode = (nextQuestionMode: boolean) => {
    if (nextQuestionMode === questionMode) return;
    setQuestionMode(nextQuestionMode);
    resetResults();
  };

  const handleScroll = (event: ReactUIEvent<HTMLElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    const nextVerseOnly = results.length > 0 && scrollTop > VERSE_ONLY_SCROLL_TOP;
    if (nextVerseOnly !== verseOnly) setVerseOnly(nextVerseOnly);
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    startYRef.current = touch.clientY;
    startTopRef.current = mainRef.current?.scrollTop || 0;
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];
    const startY = startYRef.current;
    if (!touch || startY === null) return;
    const delta = touch.clientY - startY;
    startYRef.current = null;

    if (delta < -28 && results.length > 0) {
      setVerseOnly(true);
      return;
    }

    if (startTopRef.current <= 2 && delta > 74) {
      if (verseOnly) setVerseOnly(false);
      else close();
    }
  };

  const page = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#FDF6F0]"
      style={{
        height: 'calc(var(--sion-search-page-vh, 1vh) * 100)',
        minHeight: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        overscrollBehavior: 'contain',
      }}
    >
      <header className={`flex-shrink-0 overflow-hidden bg-[#FDF6F0] px-6 ${verseOnly ? 'max-h-0 pb-0 pt-0 opacity-0 pointer-events-none' : 'max-h-28 pb-4 pt-5 opacity-100'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl border bg-white p-2 shadow-sm" style={{ borderColor: T.line }}>
              {questionMode ? <Layers3 size={20} style={{ color: T.accent }} /> : <Search size={20} style={{ color: T.accent }} />}
            </div>
            <div className="min-w-0">
              <h2 className="title-font text-2xl font-black leading-tight" style={{ color: T.text }}>성경 검색</h2>
              <p className="mt-0.5 text-[11px] font-black" style={{ color: T.accent }}>
                {questionMode ? '질문을 주제와 문맥의 흐름으로 찾기' : '단어 또는 성경 위치로 찾기'}
              </p>
            </div>
          </div>
          <button type="button" onClick={close} className="flex-shrink-0 rounded-full p-2 transition-colors hover:bg-black/5" aria-label="검색 닫기">
            <X size={24} style={{ color: T.text }} />
          </button>
        </div>
      </header>

      <section className={`flex-shrink-0 overflow-hidden bg-[#FDF6F0] px-6 ${verseOnly ? 'max-h-0 pb-0 opacity-0 pointer-events-none' : 'max-h-[610px] pb-5 opacity-100'}`}>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => switchMode(false)}
            className="h-11 rounded-2xl border-2 text-xs font-black transition-all active:scale-95"
            style={{ borderColor: !questionMode ? 'transparent' : T.line, background: !questionMode ? T.accent : 'white', color: !questionMode ? 'white' : T.sub }}
          >
            일반 검색
          </button>
          <button
            type="button"
            onClick={() => switchMode(true)}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border-2 text-xs font-black transition-all active:scale-95"
            style={{ borderColor: questionMode ? 'transparent' : T.line, background: questionMode ? 'linear-gradient(145deg, #6F8F72, #86B7AD)' : 'white', color: questionMode ? 'white' : T.sub }}
          >
            <Layers3 size={15} />
            질문 검색
          </button>
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetResults();
            }}
            placeholder={questionMode ? '예: 사랑에 관한 말씀을 문맥에 맞게 순서대로' : '예: 사랑, 평안, 마가복음 1:1'}
            className="h-14 w-full rounded-2xl border-2 bg-white pl-12 pr-11 text-base font-bold transition-all focus:outline-none"
            style={{ borderColor: questionMode ? T.accent : T.line, color: T.text }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void searchNow(true);
            }}
          />
          {questionMode ? <Layers3 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" /> : <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />}
          {loading && <Loader2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin opacity-50" />}
        </div>

        {questionMode && (
          <button
            type="button"
            onClick={() => void searchNow(true)}
            disabled={loading || query.trim().length < 2}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(145deg, #6F8F72, #86B7AD)' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={17} />}
            질문으로 말씀 찾기
          </button>
        )}

        {error && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {questionMode && searchMeta && totalCount > 0 && (
          <div className="mt-3 rounded-2xl border bg-white/80 p-3" style={{ borderColor: T.line }}>
            <p className="text-xs font-black" style={{ color: T.accent }}>{searchMeta.summary}</p>
            <p className="mt-1 text-[11px] font-bold leading-relaxed" style={{ color: T.sub }}>{searchMeta.guide}</p>
            {searchMeta.sections.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {searchMeta.sections.slice(0, 6).map((section) => (
                  <span key={section.id} className="rounded-full bg-[#EEF6F0] px-2 py-1 text-[10px] font-black" style={{ color: T.accent }}>
                    {section.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {totalCount > 0 && <p className="mt-2 px-1 text-xs font-black" style={{ color: T.accent }}>검색 결과 {totalCount.toLocaleString()}건</p>}
      </section>

      <main
        ref={mainRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 overflow-y-auto pb-10 ${verseOnly ? 'px-4 pt-3' : 'px-6'}`}
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {verseOnly && totalCount > 0 && (
          <div className="sticky top-0 z-10 mb-3 rounded-2xl bg-[#FDF6F0]/95 py-2 backdrop-blur">
            <button
              type="button"
              onClick={() => {
                mainRef.current?.scrollTo({ top: 0 });
                setVerseOnly(false);
              }}
              className="w-full rounded-2xl border bg-white px-4 py-3 text-left text-xs font-black shadow-sm active:scale-[0.99]"
              style={{ borderColor: T.line, color: T.accent }}
            >
              ↑ 검색 메뉴 보기 · 결과 {totalCount.toLocaleString()}건
            </button>
          </div>
        )}

        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((verse, index) => {
              const section = sectionByVerseId.get(verse.id);
              const previousSection = index > 0 ? sectionByVerseId.get(results[index - 1].id) : null;
              const showSection = questionMode && section && section.id !== previousSection?.id;
              const verseRef = `${verse.bookName} ${verse.chapter}:${verse.verse}`;
              const saved = isSaved(verseRef);

              return (
                <div key={verse.id} className="space-y-3">
                  {showSection && (
                    <div className="pt-2 pb-1">
                      <div className="rounded-2xl border bg-white/80 px-4 py-3 shadow-sm" style={{ borderColor: T.line }}>
                        <p className="title-font text-sm font-black" style={{ color: T.accent }}>{section.title}</p>
                        <p className="mt-1 text-[11px] font-bold leading-relaxed" style={{ color: T.sub }}>{section.description}</p>
                      </div>
                    </div>
                  )}

                  <article className="w-full rounded-3xl border bg-white p-5 text-left shadow-sm" style={{ borderColor: T.line }}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="title-font rounded-lg bg-[#FDF6F0] px-2 py-1 text-xs font-black" style={{ color: T.accent }}>
                        {verseRef}
                      </span>
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onCopy(verse)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white active:scale-95"
                          style={{ borderColor: T.line, color: T.sub }}
                          aria-label={`${verseRef} 복사`}
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleSave(verse)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white active:scale-95"
                          style={{ borderColor: saved ? T.accent : T.line, color: saved ? T.accent : T.sub, background: saved ? '#EEF6F0' : 'white' }}
                          aria-label={saved ? `${verseRef} 북마크 해제` : `${verseRef} 북마크`}
                          aria-pressed={saved}
                        >
                          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        persist();
                        onNavigate(verse);
                      }}
                      className="w-full rounded-xl text-left active:opacity-70"
                      aria-label={`${verseRef} 말씀 열기`}
                    >
                      <p className="serif-verse whitespace-pre-wrap break-keep leading-relaxed" style={{ color: T.text, fontSize }}>
                        {sanitizeScriptureText(verse.text)}
                      </p>
                    </button>
                  </article>
                </div>
              );
            })}

            {hasMore && (
              <button
                type="button"
                onClick={() => void searchNow()}
                disabled={loading}
                className="w-full rounded-2xl border-2 border-dashed bg-white py-4 text-sm font-black transition-all active:scale-95"
                style={{ borderColor: T.line, color: T.sub }}
              >
                {loading ? '불러오는 중...' : '검색 결과 더 보기'}
              </button>
            )}
          </div>
        ) : !loading && query.trim().length >= 2 && !error ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <Search size={48} className="mb-4" />
            <p className="text-sm font-black">검색 결과가 없습니다.</p>
          </div>
        ) : !loading && !error ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <BookOpen size={48} className="mb-4" />
            <p className="text-center text-sm font-black">
              {questionMode ? '질문을 입력한 뒤 말씀 찾기를 눌러보세요.' : '찾고 싶은 단어나 성경 위치를 입력해보세요.'}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );

  return typeof document === 'undefined' ? page : createPortal(page, document.body);
}
