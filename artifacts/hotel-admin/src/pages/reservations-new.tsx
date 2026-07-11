import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/ui-custom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMemo, useRef, useState } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  useListRooms,
  useListGuests,
  useCreateGuest,
  useCreateReservation,
  type ReservationDetail,
} from '@workspace/api-client-react';
import { useUpload } from '@workspace/object-storage-web';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { Printer, Upload, Loader2, ImageIcon, X, Plus, Trash2 } from 'lucide-react';

// ─── Form schema (fixed fields only — rooms managed separately) ───
const formSchema = z.object({
  guestName: z.string().min(1, 'اسم الضيف مطلوب'),
  guestPhone: z.string().min(1, 'رقم هاتف الضيف مطلوب'),
  checkInDate: z.string().min(1, 'تاريخ الدخول مطلوب'),
  nights: z.coerce.number({ required_error: 'عدد الليالي مطلوب' }).int().min(1, 'ليلة واحدة على الأقل'),
  invoiceNumber: z.string().min(1, 'رقم الفاتورة مطلوب — لا يمكن إتمام الحجز بدونه'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Room row type (managed with useState, not react-hook-form) ───
type RoomRow = { tempId: string; roomNumber: string; pricePerNight: string };

type DiscountType = 'none' | 'percentage' | 'fixed';

// ─── Created reservation summary (supports multiple rooms) ───
type CreatedSummary = {
  reservationIds: number[];
  guestName: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  rooms: Array<{ number: string; pricePerNight: number; subtotal: number; finalAmount: number }>;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  finalTotal: number;
  invoiceNumber: string;
  notes?: string;
  employeeName: string;
  createdAt: string;
  status: string;
};

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  checked_in: 'تم تسجيل الدخول',
  checked_out: 'تم تسجيل الخروج',
  cancelled: 'ملغي',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr || !Number.isFinite(days)) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

let rowCounter = 1;
function newRow(): RoomRow {
  return { tempId: String(++rowCounter), roomNumber: '', pricePerNight: '' };
}

// ─── Searchable room selector — type to filter by room number ───
type RoomOption = { id: number; number: string; description?: string | null };

function RoomCombobox({
  value,
  onChange,
  rooms,
}: {
  value: string;
  onChange: (roomNumber: string) => void;
  rooms: RoomOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? `غرفة ${value}` : 'اختر غرفة متاحة...'}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="اكتب رقم الغرفة للبحث..." />
          <CommandList>
            <CommandEmpty>لا توجد غرفة بهذا الرقم</CommandEmpty>
            <CommandGroup>
              {rooms.map((r) => (
                <CommandItem
                  key={r.id}
                  value={r.number}
                  onSelect={(selected) => {
                    onChange(selected === value ? '' : selected);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('h-4 w-4', value === r.number ? 'opacity-100' : 'opacity-0')} />
                  غرفة {r.number}{r.description ? ` — ${r.description}` : ''}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function NewReservation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { employee } = useAuth();

  // Fetch all rooms — real availability for the chosen dates is validated by the
  // server (overlapping-reservation check), not by the room's status flag, which
  // only reflects the *current* moment and can go stale until someone checks a
  // guest out. Filtering by status here would hide rooms that are actually free
  // for the requested dates (e.g. a past stay that was never checked out).
  const { data: allRooms } = useListRooms();
  const rooms = useMemo(() => allRooms?.filter((r) => r.status !== 'maintenance'), [allRooms]);
  const { data: guests } = useListGuests();

  // ── Receipt image upload ──
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptIsPdf, setReceiptIsPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Multiple rooms state ──
  const [roomRows, setRoomRows] = useState<RoomRow[]>([
    { tempId: '0', roomNumber: '', pricePerNight: '' },
  ]);

  // ── Discount state ──
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState<string>('');

  // ── Created summary (after successful submit) ──
  const [createdSummary, setCreatedSummary] = useState<CreatedSummary | null>(null);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (res) => {
      setReceiptImageUrl(res.objectPath);
      toast({ title: 'تم الرفع', description: 'تم رفع الإيصال بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ', description: 'تعذر رفع الإيصال', variant: 'destructive' });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: '',
      guestPhone: '',
      checkInDate: new Date().toISOString().slice(0, 10),
      nights: 1,
      invoiceNumber: '',   // ← required, no auto-generation
      notes: '',
    },
  });

  const checkInDate = form.watch('checkInDate');
  const nights = form.watch('nights');

  const checkOutDate = useMemo(() => addDays(checkInDate, Number(nights) || 0), [checkInDate, nights]);

  // ── Financial calculations ──
  const subtotal = useMemo(() => {
    const n = Number(nights) || 0;
    return roomRows.reduce((sum, r) => sum + (Number(r.pricePerNight) || 0) * n, 0);
  }, [roomRows, nights]);

  const discountAmount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (discountType === 'percentage') return Math.round(subtotal * val / 100 * 100) / 100;
    if (discountType === 'fixed') return Math.min(val, subtotal);
    return 0;
  }, [discountType, discountValue, subtotal]);

  const finalTotal = useMemo(() => Math.round((subtotal - discountAmount) * 100) / 100, [subtotal, discountAmount]);

  // ── Room row helpers ──
  const updateRow = (tempId: string, field: 'roomNumber' | 'pricePerNight', value: string) => {
    setRoomRows((prev) => prev.map((r) => r.tempId === tempId ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRoomRows((prev) => [...prev, newRow()]);

  const removeRow = (tempId: string) => {
    if (roomRows.length === 1) return;
    setRoomRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  // ── File upload ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    setReceiptIsPdf(isPdf);
    setReceiptFileName(file.name);
    setReceiptPreview(URL.createObjectURL(file));
    uploadFile(file);
  }

  function clearReceiptImage() {
    setReceiptImageUrl(null);
    setReceiptPreview(null);
    setReceiptFileName(null);
    setReceiptIsPdf(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const createGuest = useCreateGuest();
  const createRes = useCreateReservation();

  // ── Submit ──
  async function onSubmit(values: FormValues) {
    if (!employee) {
      toast({ title: 'خطأ', description: 'يجب تسجيل الدخول لإنشاء حجز', variant: 'destructive' });
      return;
    }

    // Validate all room rows
    const resolvedRooms: Array<{ room: NonNullable<typeof rooms>[number]; pricePerNight: number }> = [];
    const selectedNumbers = new Set<string>();

    for (const row of roomRows) {
      const num = row.roomNumber.trim().toLowerCase();
      if (!num) {
        toast({ title: 'خطأ', description: 'يرجى إدخال رقم جميع الغرف', variant: 'destructive' });
        return;
      }
      if (selectedNumbers.has(num)) {
        toast({ title: 'خطأ', description: `تم اختيار الغرفة "${row.roomNumber}" أكثر من مرة`, variant: 'destructive' });
        return;
      }
      selectedNumbers.add(num);
      const found = rooms?.find((r) => r.number.trim().toLowerCase() === num);
      if (!found) {
        toast({ title: 'خطأ', description: `لم يتم العثور على غرفة "${row.roomNumber}" ضمن الغرف المتاحة`, variant: 'destructive' });
        return;
      }
      const price = Number(row.pricePerNight);
      if (!Number.isFinite(price) || price < 0) {
        toast({ title: 'خطأ', description: `سعر الليلة لغرفة "${row.roomNumber}" غير صالح`, variant: 'destructive' });
        return;
      }
      resolvedRooms.push({ room: found, pricePerNight: price });
    }

    try {
      // Resolve guest
      let guestId: number;
      const existingGuest = guests?.find(
        (g) => g.phone.trim() === values.guestPhone.trim() ||
               g.name.trim().toLowerCase() === values.guestName.trim().toLowerCase()
      );
      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        const newGuest = await createGuest.mutateAsync({
          data: { name: values.guestName.trim(), phone: values.guestPhone.trim(), nationalId: values.guestPhone.trim() },
        });
        guestId = (newGuest as { id: number }).id;
      }

      const computedCheckOut = addDays(values.checkInDate, values.nights);

      // Compute per-room discounted amount proportionally
      const roomsWithAmounts = resolvedRooms.map((rr) => {
        const roomSubtotal = rr.pricePerNight * values.nights;
        const finalAmount = subtotal > 0
          ? Math.round(roomSubtotal * (finalTotal / subtotal) * 100) / 100
          : 0;
        return { ...rr, roomSubtotal, finalAmount };
      });

      // Create one reservation per room
      const createdIds: number[] = [];
      let firstCreatedAt = '';
      let firstStatus = 'confirmed';

      for (const rr of roomsWithAmounts) {
        const created = await createRes.mutateAsync({
          data: {
            roomId: rr.room.id,
            guestId,
            employeeId: employee.id,
            checkInDate: values.checkInDate,
            checkOutDate: computedCheckOut,
            totalAmount: rr.finalAmount,
            paymentReceiptNumber: values.invoiceNumber,
            receiptImageUrl: receiptImageUrl ?? undefined,
            notes: values.notes,
          },
        });
        const detail = created as ReservationDetail;
        createdIds.push(detail.id);
        if (!firstCreatedAt) {
          firstCreatedAt = detail.createdAt;
          firstStatus = detail.status;
        }
      }

      setCreatedSummary({
        reservationIds: createdIds,
        guestName: values.guestName,
        guestPhone: values.guestPhone,
        checkInDate: values.checkInDate,
        checkOutDate: computedCheckOut,
        nights: values.nights,
        rooms: roomsWithAmounts.map((rr) => ({
          number: rr.room.number,
          pricePerNight: rr.pricePerNight,
          subtotal: rr.roomSubtotal,
          finalAmount: rr.finalAmount,
        })),
        subtotal,
        discountType,
        discountValue: Number(discountValue) || 0,
        discountAmount,
        finalTotal,
        invoiceNumber: values.invoiceNumber,
        notes: values.notes,
        employeeName: employee.name,
        createdAt: firstCreatedAt,
        status: firstStatus,
      });

      toast({ title: 'نجاح', description: `تم إنشاء ${createdIds.length} حجز بنجاح` });
    } catch (err: unknown) {
      let description = 'تعذر إنشاء الحجز';
      try {
        const e = err as { response?: Response };
        if (e?.response) {
          const body = await e.response.json() as { error?: string };
          if (body?.error) description = body.error;
        } else if (err instanceof Error) {
          description = err.message;
        }
      } catch { /* ignore */ }
      toast({ title: 'خطأ', description, variant: 'destructive' });
    }
  }

  // ─────────────────────────────────────────────────
  // RECEIPT SCREEN
  // ─────────────────────────────────────────────────
  if (createdSummary) {
    return (
      <Layout>
        <PageHeader title="تم إنشاء الحجز" description="يمكنك الآن طباعة الفاتورة" />
        <div className="max-w-xl mx-auto">
          <div id="receipt-print-area" className="bg-card border border-card-border rounded-lg shadow-sm p-8 print:shadow-none print:border-0">
            {/* Header */}
            <div className="text-center mb-6 border-b border-border pb-4">
              <h2 className="text-xl font-bold">فندق لاس فيجاس</h2>
              <p className="text-sm text-muted-foreground">فاتورة حجز</p>
            </div>

            {/* Meta */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم الفاتورة:</span>
                <span className="font-mono font-semibold">{createdSummary.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">أرقام الحجوزات:</span>
                <span className="font-mono">{createdSummary.reservationIds.map((id) => `#${id}`).join('، ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">اسم الضيف:</span>
                <span className="font-medium">{createdSummary.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم الهاتف:</span>
                <span>{createdSummary.guestPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الدخول:</span>
                <span>{createdSummary.checkInDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الخروج:</span>
                <span>{createdSummary.checkOutDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد الليالي:</span>
                <span>{createdSummary.nights}</span>
              </div>
            </div>

            {/* Rooms table */}
            <table className="w-full text-sm mb-4 border border-border rounded">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground">
                  <th className="text-right p-2 font-medium">الغرفة</th>
                  <th className="text-right p-2 font-medium">سعر الليلة</th>
                  <th className="text-right p-2 font-medium">الإجمالي</th>
                  {createdSummary.discountType !== 'none' && (
                    <th className="text-right p-2 font-medium">بعد الخصم</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {createdSummary.rooms.map((r) => (
                  <tr key={r.number}>
                    <td className="p-2 font-semibold">{r.number}</td>
                    <td className="p-2">{r.pricePerNight.toFixed(2)} ج.م</td>
                    <td className="p-2">{r.subtotal.toFixed(2)} ج.م</td>
                    {createdSummary.discountType !== 'none' && (
                      <td className="p-2 text-primary font-medium">{r.finalAmount.toFixed(2)} ج.م</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="space-y-1.5 text-sm border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الإجمالي قبل الخصم:</span>
                <span>{createdSummary.subtotal.toFixed(2)} ج.م</span>
              </div>
              {createdSummary.discountType !== 'none' && (
                <div className="flex justify-between text-destructive">
                  <span>
                    الخصم
                    {createdSummary.discountType === 'percentage'
                      ? ` (${createdSummary.discountValue}%)`
                      : ` (مبلغ ثابت)`}:
                  </span>
                  <span>- {createdSummary.discountAmount.toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
                <span>الإجمالي النهائي:</span>
                <span className="text-primary">{createdSummary.finalTotal.toFixed(2)} ج.م</span>
              </div>
            </div>

            {/* Other info */}
            <div className="space-y-2 text-sm mt-4 border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">حالة الحجز:</span>
                <span>{statusLabels[createdSummary.status] ?? createdSummary.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                <span>{formatDateTime(createdSummary.createdAt)}</span>
              </div>
              {createdSummary.notes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ملاحظات:</span>
                  <span>{createdSummary.notes}</span>
                </div>
              )}
              {receiptPreview && (
                <div className="pt-3">
                  <span className="text-muted-foreground block mb-2">إيصال الدفع:</span>
                  {receiptIsPdf ? (
                    <a href={receiptPreview} target="_blank" rel="noreferrer" className="text-primary underline text-sm">
                      {receiptFileName ?? 'عرض ملف PDF'}
                    </a>
                  ) : (
                    <img src={receiptPreview} alt="إيصال الدفع" className="max-h-64 rounded border border-border" />
                  )}
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground">الموظف المسؤول:</span>
                <span className="font-medium">{createdSummary.employeeName}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6 print:hidden">
            <Button variant="outline" onClick={() => setLocation('/reservations')}>
              العودة إلى الحجوزات
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة الفاتورة
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ─────────────────────────────────────────────────
  // FORM SCREEN
  // ─────────────────────────────────────────────────
  const isSubmitting = createRes.isPending || createGuest.isPending;

  return (
    <Layout>
      <PageHeader title="إنشاء حجز جديد" description="إضافة حجز غرفة أو أكثر لضيف" />

      <div className="max-w-2xl bg-card border border-card-border rounded-lg shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Guest info ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الضيف</FormLabel>
                    <FormControl>
                      <Input placeholder="اكتب اسم الضيف..." list="guests-list" {...field} />
                    </FormControl>
                    <datalist id="guests-list">
                      {guests?.map((g) => <option key={g.id} value={g.name} />)}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم هاتف الضيف</FormLabel>
                    <FormControl>
                      <Input placeholder="رقم الهاتف..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkInDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الدخول</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عدد الليالي</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">تاريخ الخروج (تلقائي)</label>
                <Input type="date" value={checkOutDate} disabled readOnly />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">الموظف المسؤول</label>
                <Input value={employee?.name ?? ''} disabled readOnly />
              </div>
            </div>

            {/* ── Rooms (dynamic) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold leading-none">الغرف المحجوزة</label>
                <Button type="button" size="sm" variant="outline" onClick={addRow}>
                  <Plus className="h-3.5 w-3.5 ml-1" /> إضافة غرفة
                </Button>
              </div>

              {roomRows.map((row, idx) => (
                <div key={row.tempId} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">رقم الغرفة</label>
                    <RoomCombobox
                      value={row.roomNumber}
                      onChange={(val) => updateRow(row.tempId, 'roomNumber', val)}
                      rooms={
                        rooms?.filter(
                          (r) => !roomRows.some((rr) => rr.tempId !== row.tempId && rr.roomNumber === r.number)
                        ) ?? []
                      }
                    />
                  </div>

                  <div className="w-40 space-y-1">
                    <label className="text-xs text-muted-foreground">سعر الليلة (ج.م)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={row.pricePerNight}
                      onChange={(e) => updateRow(row.tempId, 'pricePerNight', e.target.value)}
                    />
                  </div>

                  <div className="w-32 space-y-1">
                    <label className="text-xs text-muted-foreground">مجموع الغرفة</label>
                    <Input
                      value={`${(Number(row.pricePerNight) * (Number(nights) || 0)).toFixed(2)} ج.م`}
                      disabled
                      readOnly
                      className="text-sm"
                    />
                  </div>

                  {roomRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.tempId)}
                      className="mt-6 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      aria-label={`حذف الغرفة ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ── Discount ── */}
            <div className="space-y-3 p-4 bg-muted/10 rounded-lg border border-border">
              <label className="text-sm font-semibold leading-none block">الخصم (اختياري)</label>
              <div className="flex items-center gap-3">
                <Select value={discountType} onValueChange={(v) => { setDiscountType(v as DiscountType); setDiscountValue(''); }}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون خصم</SelectItem>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ج.م)</SelectItem>
                  </SelectContent>
                </Select>

                {discountType !== 'none' && (
                  <Input
                    type="number"
                    min={0}
                    max={discountType === 'percentage' ? 100 : undefined}
                    step={discountType === 'percentage' ? '0.1' : '0.01'}
                    placeholder={discountType === 'percentage' ? 'مثال: 10' : 'مثال: 50'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-40"
                  />
                )}
              </div>
            </div>

            {/* ── Totals summary ── */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>الإجمالي قبل الخصم:</span>
                <span className="font-mono">{subtotal.toFixed(2)} ج.م</span>
              </div>
              {discountType !== 'none' && discountAmount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>
                    الخصم
                    {discountType === 'percentage' ? ` (${discountValue}%)` : ' (مبلغ ثابت)'}:
                  </span>
                  <span className="font-mono">- {discountAmount.toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-primary/20 pt-2">
                <span>الإجمالي النهائي:</span>
                <span className="font-mono text-primary">{finalTotal.toFixed(2)} ج.م</span>
              </div>
            </div>

            {/* ── Invoice number (required) ── */}
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    رقم الفاتورة
                    <span className="text-destructive mr-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل رقم الفاتورة..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Receipt image ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">إيصال الدفع (صورة أو PDF)</label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? (
                    <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الرفع... {progress}%</>
                  ) : (
                    <><Upload className="ml-2 h-4 w-4" /> رفع إيصال الدفع</>
                  )}
                </Button>
                {receiptPreview ? (
                  <div className="relative">
                    {receiptIsPdf ? (
                      <div className="h-16 w-16 flex flex-col items-center justify-center rounded border border-border bg-muted text-[10px] text-muted-foreground px-1 text-center">
                        <span className="font-semibold">PDF</span>
                        <span className="truncate max-w-full">{receiptFileName}</span>
                      </div>
                    ) : (
                      <img src={receiptPreview} alt="معاينة الإيصال" className="h-16 w-16 object-cover rounded border border-border" />
                    )}
                    <button type="button" onClick={clearReceiptImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> اختياري — JPG، PNG أو PDF
                  </span>
                )}
              </div>
            </div>

            {/* ── Notes ── */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات إضافية</FormLabel>
                  <FormControl>
                    <Textarea placeholder="أية طلبات خاصة..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Actions ── */}
            <div className="flex justify-end gap-4 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setLocation('/reservations')}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الإنشاء...</>
                ) : (
                  `تأكيد الحجز${roomRows.length > 1 ? ` (${roomRows.length} غرف)` : ''}`
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
