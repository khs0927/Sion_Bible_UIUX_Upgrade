import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, Search, X } from 'lucide-react';
import { BIBLE_BOOKS, type BibleBook } from '../../data/bibleBooks';

interface BibleBookChapterSelectorProps {
  selectedBook: BibleBook;
  selectedChapter: number;
  onSelectReference: (book: BibleBook, chapter: number) => void;
}

type TestamentFilter = 'old' | 'new';
type PickerStep = 'book' | 'chapter';

export function BibleBookChapterSelector({
  selectedBook,
  selectedChapter,
  onSelectReference,
}: BibleBookChapterSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [testament, setTestament] = useState<TestamentFilter>(selectedBook.testament);
  const [step, setStep] = useState<PickerStep>('book');
  const [pendingBook, setPendingBook] = useState<BibleBook>(selectedBook);

  const currentBookIndex = useMemo(
    () => BIBLE_BOOKS.findIndex((book) => book.id === selectedBook.id),
    [selectedBook.id],
  );

  const previousReference = useMemo(() => {
    if (selectedChapter > 1) return { book: selectedBook, chapter: selectedChapter - 1 };
    if (currentBookIndex <= 0) return null;
    const previousBook = BIBLE_BOOKS[currentBookIndex - 1];
    return { book: previousBook, chapter: previousBook.chapters };
  }, [currentBookIndex, selectedBook, selectedChapter]);

  const nextReference = useMemo(() => {
    if (selectedChapter < selectedBook.chapters) return { book: selectedBook, chapter: selectedChapter + 1 };
    if (currentBookIndex < 0 || currentBookIndex >= BIBLE_BOOKS.length - 1) return null;
    const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
    return { book: nextBook, chapter: 1 };
  }, [currentBookIndex, selectedBook, selectedChapter]);

  const filteredBooks = useMemo(
    () => BIBLE_BOOKS.filter((book) => {
      const matchesTestament = book.testament === testament;
      const normalizedSearch = bookSearch.trim();
      const matchesSearch = !normalizedSearch
        || book.name.includes(normalizedSearch)
        || book.abbr.includes(normalizedSearch);
      return matchesTestament && matchesSearch;
    }),
    [bookSearch, testament],
  );

  const openPicker = () => {
    setPendingBook(selectedBook);
    setTestament(selectedBook.testament);
    setBookSearch('');
    setStep('book');
    setShowPicker(true);
  };

  const selectBook = (book: BibleBook) => {
    setPendingBook(book);
    setStep('chapter');
  };

  const selectChapter = (chapter: number) => {
    onSelectReference(pendingBook, chapter);
    setShowPicker(false);
  };

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={openPicker}
        className="flex w-full touch-manipulation items-center justify-between rounded-[18px] border bg-white px-4 py-3 text-left shadow-sm active:opacity-80"
        style={{ borderColor: '#E8D8C8' }}
        aria-label={`성경 본문 선택, 현재 ${selectedBook.name} ${selectedChapter}장`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F4EAE0] text-[#7B6A5D]">
            <BookOpen size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-black tracking-[0.16em] text-[#9A897B]">
              {selectedBook.testament === 'old' ? '구약' : '신약'} · 본문 선택
            </span>
            <span className="title-font block truncate text-lg font-black text-[#3D3129]">
              {selectedBook.name} {selectedChapter}장
            </span>
          </span>
        </span>
        <ChevronDown size={20} className="flex-shrink-0 text-[#8C786E]" />
      </button>

      <div className="grid grid-cols-2 gap-2" aria-label="이전 장과 다음 장 이동">
        <button
          type="button"
          disabled={!previousReference}
          onClick={() => previousReference && onSelectReference(previousReference.book, previousReference.chapter)}
          className="flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-[#E8D8C8] bg-white px-3 text-xs font-black text-[#6F6259] disabled:cursor-not-allowed disabled:opacity-35 active:opacity-75"
          aria-label={previousReference ? `${previousReference.book.name} ${previousReference.chapter}장으로 이동` : '이전 장 없음'}
        >
          <ArrowLeft size={16} />
          <span>이전 장</span>
        </button>
        <button
          type="button"
          disabled={!nextReference}
          onClick={() => nextReference && onSelectReference(nextReference.book, nextReference.chapter)}
          className="flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-[#D8E4D5] bg-[#F5FAF3] px-3 text-xs font-black text-[#4E7F59] disabled:cursor-not-allowed disabled:opacity-35 active:opacity-75"
          aria-label={nextReference ? `${nextReference.book.name} ${nextReference.chapter}장으로 이동` : '다음 장 없음'}
        >
          <span>다음 장</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {showPicker && (
        <div className="fixed inset-0 z-[1200] flex items-end sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="성경 본문 선택 닫기"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setShowPicker(false)}
          />

          <section className="relative flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-white bg-[#FDF6F0] shadow-2xl sm:h-auto sm:max-h-[86vh] sm:max-w-2xl sm:rounded-[28px] sm:border">
            <div className="mx-auto my-2 h-1 w-10 flex-shrink-0 rounded-full bg-gray-300/70 sm:hidden" />

            <header className="flex flex-shrink-0 items-center justify-between px-5 pb-4 pt-3 sm:pt-5">
              <div>
                <p className="text-[10px] font-black tracking-[0.18em] text-[#9A897B]">
                  {step === 'book' ? '1단계' : '2단계'}
                </p>
                <h3 className="title-font text-xl font-black text-[#3D3129]">
                  {step === 'book' ? '성경 책 선택' : `${pendingBook.name} 장 선택`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="grid h-11 w-11 touch-manipulation place-items-center rounded-full bg-black/5 active:opacity-70"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </header>

            {step === 'book' ? (
              <>
                <div className="flex-shrink-0 px-5">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#EFE5DB] p-1.5">
                    {(['old', 'new'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTestament(value)}
                        className="min-h-11 touch-manipulation rounded-xl px-4 py-3 text-sm font-black active:opacity-80"
                        style={{
                          background: testament === value ? '#8D95D8' : 'transparent',
                          color: testament === value ? '#FFFFFF' : '#7B6A5D',
                          boxShadow: testament === value ? '0 4px 12px rgba(81, 86, 151, 0.2)' : 'none',
                        }}
                      >
                        {value === 'old' ? '구약' : '신약'}
                      </button>
                    ))}
                  </div>

                  <div className="mb-4 mt-3 flex min-h-12 items-center gap-3 rounded-2xl border border-[#E8D8C8] bg-white px-4 py-3 focus-within:border-[#8D95D8]">
                    <Search size={18} className="text-[#8C786E]" />
                    <input
                      value={bookSearch}
                      onChange={(event) => setBookSearch(event.target.value)}
                      placeholder="성경 책 검색 (예: 창세기, 요한)"
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
                  {filteredBooks.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-[#E8D8C8] bg-white/70 px-4 py-10 text-center text-sm font-bold text-[#8C786E]">
                      검색되는 성경 책이 없습니다.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {filteredBooks.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => selectBook(book)}
                          className="flex min-h-[72px] touch-manipulation flex-col items-center justify-center rounded-2xl border bg-white px-2 py-3 text-center active:opacity-75"
                          style={{
                            borderColor: selectedBook.id === book.id ? '#8D95D8' : '#E8D8C8',
                            background: selectedBook.id === book.id ? '#F1F2FF' : '#FFFFFF',
                          }}
                        >
                          <span className="text-xs font-black text-[#3D3129]">{book.name}</span>
                          <span className="mt-1 text-[10px] font-bold text-[#8C786E]">{book.chapters}장</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex-shrink-0 px-5 pb-3">
                  <button
                    type="button"
                    onClick={() => setStep('book')}
                    className="min-h-11 touch-manipulation rounded-xl border border-[#E8D8C8] bg-white px-4 py-2 text-xs font-black text-[#7B6A5D] active:opacity-75"
                  >
                    ← 성경 책 다시 선택
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
                    {Array.from({ length: pendingBook.chapters }, (_, index) => index + 1).map((chapter) => (
                      <button
                        key={chapter}
                        type="button"
                        onClick={() => selectChapter(chapter)}
                        className="aspect-square min-h-11 touch-manipulation rounded-2xl border text-sm font-black active:opacity-75"
                        style={{
                          borderColor: pendingBook.id === selectedBook.id && chapter === selectedChapter ? '#8D95D8' : '#E8D8C8',
                          background: pendingBook.id === selectedBook.id && chapter === selectedChapter ? '#8D95D8' : '#FFFFFF',
                          color: pendingBook.id === selectedBook.id && chapter === selectedChapter ? '#FFFFFF' : '#3D3129',
                        }}
                      >
                        {chapter}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
