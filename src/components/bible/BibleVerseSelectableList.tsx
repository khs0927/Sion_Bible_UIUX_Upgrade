import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Check, Minus, Palette, PenLine, X } from 'lucide-react';
import { sanitizeScriptureText } from '../../utils/textUtils';
import { VerseDevotionPanel } from './VerseDevotionPanel';
import { KawaiiMeditationIcon, KawaiiPrayerIcon, KawaiiVerseIcon, KawaiiWisdomIcon } from '../icons';
import verseCopyIcon from '../../assets/design/verse-actions/copy.png';

interface Verse {
  verse: number;
  text: string;
}

type HighlightColor = 'yellow' | 'green' | 'pink' | 'blue' | 'purple';
type UnderlineStyle = 'none' | 'solid' | 'dashed' | 'wavy';
type DetailTab = 'explanation' | 'meditation' | 'prayer' | 'question';

type VerseAnnotation = {
  color: HighlightColor;
  underline: UnderlineStyle;
};

interface BibleVerseSelectableListProps {
  verses: Verse[];
  selectedVerses: number[];
  onToggleVerse: (verseNumber: number) => void;
  mode: 'read' | 'select';
  onVerseClick: (verse: Verse) => void;
  fontSize: string;
  onToggleSave?: (verse: Verse) => void;
  isSaved?: (verseNumber: number) => boolean;
  onCopy?: (verse: Verse) => void;
  selectionMode?: boolean;
  referenceLabel?: string;
}

const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#FFF0A3',
  green: '#DDEFC6',
  pink: '#FFD7E2',
  blue: '#D8E7FF',
  purple: '#E7DBFF',
};

const ANNOTATION_STORAGE_PREFIX = 'sion_bible_annotation_v2';
const LEGACY_ANNOTATION_PREFIX = 'sion_bible_annotation_';
const LEGACY_ANNOTATION_CLEANUP_KEY = 'sion_bible_annotation_legacy_cleanup_v2';

function annotationScope(referenceLabel: string) {
  const normalized = referenceLabel.trim();
  return encodeURIComponent(normalized || 'unknown-reference');
}

function annotationKey(referenceLabel: string, verse: number) {
  return `${ANNOTATION_STORAGE_PREFIX}_${annotationScope(referenceLabel)}_${verse}`;
}

function clearLegacyAnnotationsOnce() {
  try {
    if (localStorage.getItem(LEGACY_ANNOTATION_CLEANUP_KEY) === '1') return;

    const legacyKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (
        key.startsWith(LEGACY_ANNOTATION_PREFIX)
        && !key.startsWith(`${ANNOTATION_STORAGE_PREFIX}_`)
        && key !== LEGACY_ANNOTATION_CLEANUP_KEY
      ) {
        legacyKeys.push(key);
      }
    }

    for (const key of legacyKeys) localStorage.removeItem(key);
    localStorage.setItem(LEGACY_ANNOTATION_CLEANUP_KEY, '1');
  } catch {
    // localStorage can be unavailable in private/restricted browser contexts.
  }
}

function readAnnotation(referenceLabel: string, verse: number): VerseAnnotation | null {
  try {
    const raw = localStorage.getItem(annotationKey(referenceLabel, verse));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VerseAnnotation>;
    if (!parsed.color || !Object.prototype.hasOwnProperty.call(HIGHLIGHT_COLORS, parsed.color)) return null;
    return {
      color: parsed.color,
      underline: parsed.underline === 'solid' || parsed.underline === 'dashed' || parsed.underline === 'wavy' ? parsed.underline : 'none',
    };
  } catch {
    return null;
  }
}

export function BibleVerseSelectableList({
  verses,
  selectedVerses,
  onToggleVerse,
  mode,
  onVerseClick,
  fontSize,
  onToggleSave,
  isSaved,
  onCopy,
  selectionMode = false,
  referenceLabel = '',
}: BibleVerseSelectableListProps) {
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<Record<number, VerseAnnotation>>({});
  const [detailTab, setDetailTab] = useState<DetailTab | null>(null);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    clearLegacyAnnotationsOnce();

    const next: Record<number, VerseAnnotation> = {};
    for (const verse of verses) {
      const stored = readAnnotation(referenceLabel, verse.verse);
      if (stored) next[verse.verse] = stored;
    }
    setAnnotations(next);
    setActiveVerse(null);
    setDetailTab(null);
  }, [referenceLabel, verses]);

  const activeAnnotation = useMemo(
    () => activeVerse ? annotations[activeVerse] ?? { color: 'yellow' as const, underline: 'none' as const } : null,
    [activeVerse, annotations],
  );

  const activeVerseData = useMemo(
    () => verses.find((item) => item.verse === activeVerse) ?? null,
    [activeVerse, verses],
  );

  const selectedVerseDetail = activeVerseData
    ? {
        ref: `${referenceLabel}${referenceLabel ? ':' : ''}${activeVerseData.verse}`,
        text: activeVerseData.text,
      }
    : null;

  const updateAnnotation = (patch: Partial<VerseAnnotation>) => {
    if (!activeVerse) return;
    const next = {
      color: activeAnnotation?.color ?? 'yellow',
      underline: activeAnnotation?.underline ?? 'none',
      ...patch,
    };
    setAnnotations((current) => ({ ...current, [activeVerse]: next }));
    localStorage.setItem(annotationKey(referenceLabel, activeVerse), JSON.stringify(next));
  };

  const clearAnnotation = () => {
    if (!activeVerse) return;
    localStorage.removeItem(annotationKey(referenceLabel, activeVerse));
    setAnnotations((current) => {
      const next = { ...current };
      delete next[activeVerse];
      return next;
    });
  };

  const closeSheet = () => {
    setActiveVerse(null);
    setDetailTab(null);
  };

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current !== null && event.clientY - dragStartY.current > 64) closeSheet();
    dragStartY.current = null;
  };

  if (verses.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[#E8D8C8] bg-white px-5 py-10 text-center text-sm font-bold text-[#8C786E]">
        이 장에 표시할 말씀이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[#EFE5DA] overflow-hidden rounded-[22px] border border-[#E8D8C8] bg-white shadow-sm">
        {verses.map((verse) => {
          const selected = selectedVerses.includes(verse.verse);
          const showCheckbox = mode === 'select' || selectionMode;
          const saved = isSaved?.(verse.verse) ?? false;
          const annotation = annotations[verse.verse];
          const isActive = activeVerse === verse.verse;

          return (
            <div
              key={verse.verse}
              id={`verse-${verse.verse}`}
              className={[
                'relative w-full px-3 py-1.5 text-left transition-all',
                selected && showCheckbox
                  ? 'bg-[#EAF2E6] ring-2 ring-inset ring-[#6F8F72]/70'
                  : isActive
                    ? 'bg-[#FFF6DD] ring-2 ring-inset ring-[#D0A13D] shadow-[inset_4px_0_0_#D0A13D]'
                    : 'bg-white hover:bg-[#FFFDF8]',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex w-7 shrink-0 flex-col items-center gap-0.5">
                  {showCheckbox ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={[
                        'inline-flex h-5 min-w-5 items-center justify-center rounded-md text-[9px] font-black leading-none transition-colors',
                        selected ? 'bg-[#6F8F72] text-white' : 'bg-[#F7EFE7] text-[#8C6F55]',
                      ].join(' ')}>{verse.verse}</span>
                      <button
                        type="button"
                        aria-label={`${verse.verse}절 선택`}
                        aria-pressed={selected}
                        onClick={() => onToggleVerse(verse.verse)}
                        className={[
                          'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                          selected ? 'bg-[#6F8F72] text-white' : 'bg-transparent text-[#C8B9AB]',
                        ].join(' ')}
                      >
                        <Check size={16} strokeWidth={3.5} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={[
                        'inline-flex h-5 min-w-5 items-center justify-center rounded-md text-[9px] font-black leading-none transition-colors',
                        isActive ? 'bg-[#D0A13D] text-white' : 'bg-[#F7EFE7] text-[#8C6F55]',
                      ].join(' ')}>{verse.verse}</span>
                      <button
                        type="button"
                        aria-label={`${verse.verse}절 ${saved ? '저장 취소' : '저장'}`}
                        aria-pressed={saved}
                        onClick={() => onToggleSave?.(verse)}
                        disabled={!onToggleSave}
                        className="inline-flex h-7 w-7 items-center justify-center bg-transparent p-0 text-[#B9A99A] transition active:scale-90 disabled:cursor-default"
                      >
                        <Bookmark size={16} fill={saved ? '#6F8F72' : 'transparent'} stroke={saved ? '#6F8F72' : 'currentColor'} strokeWidth={2} />
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (showCheckbox) onToggleVerse(verse.verse);
                    else {
                      setActiveVerse(verse.verse);
                      setDetailTab(null);
                    }
                  }}
                  className="serif-verse min-w-0 flex-1 bg-transparent p-0 text-left leading-[1.55] text-[#3D3129] no-underline"
                  style={{ fontSize, whiteSpace: 'pre-wrap', textDecoration: 'none' }}
                  aria-pressed={isActive}
                >
                  <span
                    style={{
                      backgroundColor: annotation ? HIGHLIGHT_COLORS[annotation.color] : 'transparent',
                      boxDecorationBreak: 'clone',
                      WebkitBoxDecorationBreak: 'clone',
                      padding: annotation ? '0 .08em' : undefined,
                      borderRadius: annotation ? '0.12em' : undefined,
                      textDecorationLine: annotation?.underline && annotation.underline !== 'none' ? 'underline' : 'none',
                      textDecorationStyle: annotation?.underline === 'wavy' ? 'wavy' : annotation?.underline === 'dashed' ? 'dashed' : 'solid',
                      textDecorationThickness: annotation?.underline && annotation.underline !== 'none' ? '2px' : undefined,
                      textUnderlineOffset: annotation?.underline && annotation.underline !== 'none' ? '4px' : undefined,
                    }}
                  >
                    {sanitizeScriptureText(verse.text)}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeVerse && activeAnnotation && activeVerseData && mode === 'read' && !selectionMode && (
        <div className="fixed inset-x-0 bottom-0 z-[1400] mx-auto flex max-h-[88dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[28px] border-x border-t border-[#D8C7B4] bg-[#FFFDF8] shadow-[0_-20px_60px_rgba(54,43,33,.24)]">
          <div
            className="shrink-0 cursor-grab px-4 pb-2 pt-2 active:cursor-grabbing"
            onPointerDown={handleDragStart}
            onPointerUp={handleDragEnd}
            onPointerCancel={() => { dragStartY.current = null; }}
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-[#CBB9A6]" />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3">
            <div className="min-w-0">
              <div className="text-[11px] font-black text-[#A17C5B]">선택한 말씀</div>
              <div className="truncate text-sm font-black text-[#3D3129]">{selectedVerseDetail?.ref || `${activeVerse}절`}</div>
            </div>
            <div className="flex items-center gap-1">
              {onCopy && (
                <button
                  type="button"
                  onClick={() => onCopy(activeVerseData)}
                  aria-label="선택한 구절 복사"
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF6DD] text-[#604B2F] transition active:scale-90"
                >
                  <img src={verseCopyIcon} alt="" className="h-5 w-5 object-contain" />
                </button>
              )}
              <button type="button" onClick={closeSheet} aria-label="구절 도구 닫기" className="rounded-full p-2 text-[#78695E]"><X size={20} /></button>
            </div>
          </div>

          <div className="shrink-0 border-y border-[#E8DCCF] bg-[#FFF9EF] px-3 py-3">
            <div className="flex items-center gap-2 pb-2">
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-[#8A786B]"><Palette size={14} />형광펜</span>
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`${color} 형광펜`}
                    aria-pressed={activeAnnotation.color === color}
                    onClick={() => updateAnnotation({ color })}
                    className="h-9 w-9 shrink-0 rounded-full border-[3px] shadow-sm transition active:scale-95"
                    style={{ backgroundColor: HIGHLIGHT_COLORS[color], borderColor: activeAnnotation.color === color ? '#6F4D27' : '#FFFFFF', outline: activeAnnotation.color === color ? '2px solid #D0A13D' : 'none' }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={clearAnnotation}
                className="inline-flex h-9 shrink-0 items-center rounded-xl border border-[#D6C3AE] bg-white px-2.5 text-[11px] font-black text-[#725F51]"
              >
                표시 지우기
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <button type="button" onClick={() => updateAnnotation({ underline: 'none' })} className={`inline-flex h-9 shrink-0 items-center rounded-xl border px-3 text-xs font-black ${activeAnnotation.underline === 'none' ? 'border-[#6F4D27] bg-[#F2E3C5]' : 'border-[#DCCDBE] bg-white'}`}>밑줄 없음</button>
              <button type="button" onClick={() => updateAnnotation({ underline: 'solid' })} className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3 text-xs font-black ${activeAnnotation.underline === 'solid' ? 'border-[#6F4D27] bg-[#F2E3C5]' : 'border-[#DCCDBE] bg-white'}`}><Minus size={16} />실선</button>
              <button type="button" onClick={() => updateAnnotation({ underline: 'dashed' })} className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3 text-xs font-black ${activeAnnotation.underline === 'dashed' ? 'border-[#6F4D27] bg-[#F2E3C5]' : 'border-[#DCCDBE] bg-white'}`}><PenLine size={16} />점선</button>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-4 gap-2 border-b border-[#E8DCCF] bg-white px-3 py-3">
            <button type="button" onClick={() => setDetailTab('explanation')} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-black transition ${detailTab === 'explanation' ? 'border-[#C88D32] bg-[#FFF0CD] text-[#66461E] shadow-sm' : 'border-[#E4D8CA] bg-[#FFFDF9] text-[#6C5A4C]'}`}><KawaiiVerseIcon size={24} /><span>해설</span></button>
            <button type="button" onClick={() => setDetailTab('meditation')} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-black transition ${detailTab === 'meditation' ? 'border-[#7E9A63] bg-[#EDF4E5] text-[#40552F] shadow-sm' : 'border-[#E4D8CA] bg-[#FFFDF9] text-[#6C5A4C]'}`}><KawaiiMeditationIcon size={24} /><span>묵상</span></button>
            <button type="button" onClick={() => setDetailTab('prayer')} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-black transition ${detailTab === 'prayer' ? 'border-[#D7A56F] bg-[#FFF0E3] text-[#6C4B31] shadow-sm' : 'border-[#E4D8CA] bg-[#FFFDF9] text-[#6C5A4C]'}`}><KawaiiPrayerIcon size={24} /><span>기도</span></button>
            <button type="button" onClick={() => setDetailTab('question')} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-black transition ${detailTab === 'question' ? 'border-[#9A8BC2] bg-[#F1ECFA] text-[#51446F] shadow-sm' : 'border-[#E4D8CA] bg-[#FFFDF9] text-[#6C5A4C]'}`}><KawaiiWisdomIcon size={24} /><span>질문</span></button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
            {detailTab ? (
              <VerseDevotionPanel
                selectedVerse={selectedVerseDetail}
                visibleSection={detailTab}
                compact
                fontSize={fontSize}
                generationMode="deep"
              />
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#DDCDBA] bg-[#FFF9EF] px-5 py-5 text-center text-sm font-bold leading-6 text-[#7C6958]">
                형광펜과 밑줄을 표시하거나 구절을 복사할 수 있습니다.<br />해설을 누르면 기존의 깊은 원고 스타일로 해설·묵상·기도를 함께 준비합니다.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
