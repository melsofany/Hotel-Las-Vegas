import { useMemo, useState } from 'react';
import { useListReservations, type ReservationDetail } from '@workspace/api-client-react';
import { StatusBadge } from '@/components/ui-custom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Printer, Download, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// ─── Date helpers (string-based, avoids timezone drift) ───
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function formatArabicDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return format(d, 'dd MMMM yyyy', { locale: ar });
}

type DayOption = 'tomorrow' | 'dayAfterTomorrow';

function toCSVValue(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function OccupancyReportsPanel() {
  const [day, setDay] = useState<DayOption>('tomorrow');
  const [search, setSearch] = useState('');
  const [isFinancial, setIsFinancial] = useState(false);

  // Fetch all non-cancelled reservations; occupancy for a given date is computed
  // client-side since it depends on a date range overlap, not an exact match.
  const { data: reservations, isLoading } = useListReservations(
    {},
    { query: { queryKey: ['reservations', 'all-for-reports'] } }
  );

  const tomorrow = useMemo(() => addDaysStr(todayStr(), 1), []);
  const dayAfterTomorrow = useMemo(() => addDaysStr(todayStr(), 2), []);
  const targetDate = day === 'tomorrow' ? tomorrow : dayAfterTomorrow;

  const occupying = useMemo(() => {
    if (!reservations) return [];
    return reservations.filter((r: ReservationDetail) => {
      if (r.status === 'cancelled') return false;
      // A reservation occupies the room on `targetDate` if the stay spans that night:
      // check-in on/before it, and check-out strictly after it.
      return r.checkInDate <= targetDate && r.checkOutDate > targetDate;
    });
  }, [reservations, targetDate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return occupying;
    return occupying.filter(
      (r) => r.guest?.name?.toLowerCase().includes(q) || r.room?.number?.toLowerCase().includes(q)
    );
  }, [occupying, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.room.number.localeCompare(b.room.number, 'ar', { numeric: true })),
    [filtered]
  );

  const totalOccupants = sorted.reduce((sum, r) => sum + (r.occupants || 0), 0);
  const totalAmount = sorted.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

  function handlePrint() {
    window.print();
  }

  function handleExportCSV() {
    const headers = isFinancial
      ? ['رقم الغرفة', 'اسم الضيف', 'رقم الهاتف', 'عدد الأشخاص', 'تاريخ الدخول', 'تاريخ الخروج', 'الحالة', 'رقم الإيصال', 'المبلغ الإجمالي']
      : ['رقم الغرفة', 'اسم الضيف', 'رقم الهاتف', 'عدد الأشخاص', 'تاريخ الدخول', 'تاريخ الخروج', 'الحالة'];

    const rows = sorted.map((r) => {
      const base = [r.room.number, r.guest.name, r.guest.phone, r.occupants, r.checkInDate, r.checkOutDate, r.status];
      return isFinancial ? [...base, r.paymentReceiptNumber, r.totalAmount] : base;
    });

    const csv = [headers, ...rows].map((row) => row.map(toCSVValue).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const label = day === 'tomorrow' ? 'الغد' : 'بعد_غد';
    a.download = `تقرير_الاشغال_${label}_${targetDate}${isFinancial ? '_مالي' : ''}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-card border border-card-border rounded-lg shadow-sm">
      {/* Controls — hidden when printing */}
      <div className="p-4 border-b border-border space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <Tabs value={day} onValueChange={(v) => setDay(v as DayOption)}>
            <TabsList>
              <TabsTrigger value="tomorrow">تقرير الغد ({formatArabicDate(tomorrow)})</TabsTrigger>
              <TabsTrigger value="dayAfterTomorrow">تقرير بعد غد ({formatArabicDate(dayAfterTomorrow)})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" /> تصدير CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> طباعة
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الضيف أو رقم الغرفة..."
              className="w-full bg-background border border-input rounded-md pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-sm ${!isFinancial ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              تقرير غير مالي
            </span>
            <Switch checked={isFinancial} onCheckedChange={setIsFinancial} />
            <span className={`text-sm ${isFinancial ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              تقرير مالي
            </span>
          </div>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block p-4 border-b border-border">
        <h2 className="text-lg font-serif font-bold">
          تقرير إشغال {day === 'tomorrow' ? 'الغد' : 'بعد غد'} — {formatArabicDate(targetDate)}
        </h2>
        <p className="text-sm text-muted-foreground">{isFinancial ? 'تقرير مالي' : 'تقرير غير مالي'}</p>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{sorted.length} غرفة مشغولة — {totalOccupants} شخص{isFinancial && sorted.length > 0 ? ` — إجمالي ${totalAmount.toFixed(2)} ج.م` : ''}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="text-muted-foreground bg-muted/20 border-b border-border">
            <tr>
              <th className="p-4 font-medium">رقم الغرفة</th>
              <th className="p-4 font-medium">اسم الضيف</th>
              <th className="p-4 font-medium">رقم الهاتف</th>
              <th className="p-4 font-medium">عدد الأشخاص</th>
              <th className="p-4 font-medium">تاريخ الدخول</th>
              <th className="p-4 font-medium">تاريخ الخروج</th>
              <th className="p-4 font-medium">الحالة</th>
              {isFinancial && <th className="p-4 font-medium">رقم الإيصال</th>}
              {isFinancial && <th className="p-4 font-medium">المبلغ الإجمالي</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={isFinancial ? 9 : 7} className="p-8 text-center text-muted-foreground">جاري التحميل...</td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={isFinancial ? 9 : 7} className="p-8 text-center text-muted-foreground">
                  لا توجد غرف مشغولة في هذا التاريخ
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <span className="inline-flex items-center justify-center px-2 py-1 bg-secondary rounded text-secondary-foreground font-mono text-xs">
                      {r.room.number}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-foreground">{r.guest.name}</td>
                  <td className="p-4 text-muted-foreground">{r.guest.phone}</td>
                  <td className="p-4">{r.occupants}</td>
                  <td className="p-4 text-muted-foreground">{format(new Date(r.checkInDate), 'dd MMM yyyy', { locale: ar })}</td>
                  <td className="p-4 text-muted-foreground">{format(new Date(r.checkOutDate), 'dd MMM yyyy', { locale: ar })}</td>
                  <td className="p-4"><StatusBadge status={r.status} /></td>
                  {isFinancial && <td className="p-4 font-mono text-xs">{r.paymentReceiptNumber}</td>}
                  {isFinancial && <td className="p-4 font-medium">{r.totalAmount.toFixed(2)} ج.م</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
