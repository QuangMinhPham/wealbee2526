import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { formatVND } from '../lib/utils';
import { supabase } from '../lib/supabase/client';

const db = supabase as any;

interface DividendEvent {
  ticker: string;
  name: string;
  date: Date;
  amount: number;
  perShare: number;
  shares: number;
  yieldPct: number;
  status: 'confirmed' | 'estimated';
}

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS_VN = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export function CalendarTab() {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use user_dividend_payouts_history view — includes ex_date, pay_date, shares, per_share, total_payout
      const { data, error } = await db
        .from('user_dividend_payouts_history')
        .select('name, symbol, status, ex_date, pay_date, shares, per_share, total_payout')
        .eq('user_id', user.id)
        .order('pay_date', { ascending: true });

      if (error) { console.error('CalendarTab fetch error:', error); return; }

      const events: DividendEvent[] = (data || []).map((r: any) => {
        // Use pay_date for calendar placement; fallback to ex_date
        const dateStr = r.pay_date || r.ex_date;
        return {
          ticker: r.symbol,
          name: r.name || r.symbol,
          date: dateStr ? new Date(dateStr) : new Date(),
          amount: Number(r.total_payout) || 0,
          perShare: Number(r.per_share) || 0,
          shares: Number(r.shares) || 0,
          yieldPct: 0, // not available in the view directly
          status: (r.status || 'Confirmed').toLowerCase() === 'confirmed' ? 'confirmed' : 'estimated',
        };
      });

      setDividendEvents(events.sort((a, b) => a.date.getTime() - b.date.getTime()));
    } catch (err) {
      console.error('CalendarTab error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Get events for current month
  const monthEvents = useMemo(() => {
    return dividendEvents.filter(event => {
      return event.date.getMonth() === currentMonth.getMonth() &&
             event.date.getFullYear() === currentMonth.getFullYear();
    });
  }, [dividendEvents, currentMonth]);

  // Group events by month for list view
  const groupedEvents = useMemo(() => {
    const groups: Record<string, { events: DividendEvent[]; total: number }> = {};
    
    dividendEvents.forEach(event => {
      const monthKey = `${event.date.getFullYear()}-${event.date.getMonth()}`;
      if (!groups[monthKey]) {
        groups[monthKey] = { events: [], total: 0 };
      }
      groups[monthKey].events.push(event);
      groups[monthKey].total += event.amount;
    });

    return Object.entries(groups)
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        return {
          year: parseInt(year),
          month: parseInt(month),
          ...data
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  }, [dividendEvents]);

  // Get total for current month
  const monthTotal = useMemo(() => {
    return monthEvents.reduce((sum, event) => sum + event.amount, 0);
  }, [monthEvents]);

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const grid: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
      grid.push(null);
    }
    
    // Add all days of month
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push(new Date(year, month, i));
    }
    
    return grid;
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return monthEvents.filter(event => 
      event.date.getDate() === date.getDate()
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {MONTHS_VN[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="size-5" />
          </button>
          <span className="text-emerald-600 font-semibold">{formatVND(monthTotal)}</span>
        </div>

        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarIcon className="size-4" />Lịch
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="size-4" />Danh sách
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Đang tải lịch cổ tức...</p>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="py-3 text-center text-sm font-medium text-gray-700">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarGrid.map((date, idx) => {
              const events = getEventsForDate(date);
              const dayTotal = events.reduce((sum, e) => sum + e.amount, 0);
              
              return (
                <div
                  key={idx}
                  className={`min-h-[120px] border border-gray-200 p-2 ${
                    date ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                  } transition-colors`}
                >
                  {date && (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {date.getDate()}
                        </span>
                        {dayTotal > 0 && (
                          <span className="text-xs text-emerald-600 font-semibold">
                            {formatVND(dayTotal)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {events.map((event, eventIdx) => (
                          <div
                            key={eventIdx}
                            className="bg-blue-50 rounded px-2 py-1.5 text-xs border-l-2 border-blue-500"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <div className="size-4 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-[8px]">
                                {event.ticker[0]}
                              </div>
                              <span className="text-gray-900 font-medium">
                                {event.ticker}
                              </span>
                            </div>
                            <div className="text-emerald-600 font-semibold">
                              {formatVND(event.amount)}
                            </div>
                            <div className="text-gray-600">
                              {event.yieldPct > 0 ? `${event.yieldPct.toFixed(1)}%` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {groupedEvents.map((group, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {MONTHS_VN[group.month]} {group.year}
                </h3>
                <span className="text-emerald-600 font-semibold">
                  {formatVND(group.total)}
                </span>
              </div>

              <div className="divide-y divide-gray-200">
                {group.events.map((event, eventIdx) => (
                  <div
                    key={eventIdx}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
                  >
                    {/* Logo */}
                    <div className="size-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {event.ticker[0]}
                    </div>

                    {/* Stock Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {event.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {event.ticker}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {event.date.getDate()} Th{event.date.getMonth() + 1} {event.date.getFullYear()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {event.status === 'estimated' ? 'Ước tính' : 'Đã xác nhận'}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right min-w-[140px]">
                      <div className="text-base font-semibold text-gray-900">
                        {formatVND(event.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {event.shares.toLocaleString('vi-VN')}×{formatVND(event.perShare)}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="text-center min-w-[100px]">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${
                        event.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <CalendarIcon className="size-3" />
                        {event.status === 'confirmed' ? 'Xác nhận' : 'Ước tính'}
                      </div>
                    </div>

                    {/* Yield */}
                    {event.yieldPct > 0 && (
                      <div className="text-right min-w-[60px]">
                        <div className="text-base font-semibold text-gray-900">
                          {event.yieldPct.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500">yield</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}