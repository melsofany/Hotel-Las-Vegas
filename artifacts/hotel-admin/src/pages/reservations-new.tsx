import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/ui-custom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useListRooms, useListGuests, useCreateGuest, useCreateReservation, type ReservationDetail } from '@workspace/api-client-react';
import { useUpload } from '@workspace/object-storage-web';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { Printer, Upload, Loader2, ImageIcon, X } from 'lucide-react';

const formSchema = z.object({
  guestName: z.string().min(1, 'اسم الضيف مطلوب'),
  guestPhone: z.string().min(1, 'رقم هاتف الضيف مطلوب'),
  roomNumber: z.string().min(1, 'يرجى اختيار الغرفة أو كتابة رقمها'),
  checkInDate: z.string().min(1, 'تاريخ الدخول مطلوب'),
  nights: z.coerce.number({ required_error: 'عدد الليالي مطلوب' }).int().min(1, 'ليلة واحدة على الأقل'),
  pricePerNight: z.coerce.number({ required_error: 'سعر الليلة مطلوب' }).min(0, 'سعر غير صالح'),
  paymentReceiptNumber: z.string().min(1, 'رقم الإيصال مطلوب'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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

export default function NewReservation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { employee } = useAuth();

  const { data: rooms } = useListRooms({ status: 'available' });
  const { data: guests } = useListGuests();

  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptIsPdf, setReceiptIsPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createdReservation, setCreatedReservation] = useState<{
    id: number;
    guestName: string;
    guestPhone: string;
    roomNumber: string;
    roomType?: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    pricePerNight: number;
    totalAmount: number;
    paymentReceiptNumber: string;
    notes?: string;
    employeeName: string;
    createdAt: string;
    status: string;
  } | null>(null);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (res) => {
      setReceiptImageUrl(res.objectPath);
      toast({ title: 'تم الرفع', description: 'تم رفع صورة الإيصال بنجاح' });
    },
    onError: (err) => {
      toast({ title: 'خطأ', description: 'تعذر رفع صورة الإيصال', variant: 'destructive' });
      console.error(err);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: '',
      guestPhone: '',
      roomNumber: '',
      checkInDate: new Date().toISOString().slice(0, 10),
      nights: 1,
      pricePerNight: 0,
      paymentReceiptNumber: `REC-${Math.floor(Math.random() * 100000)}`,
      notes: '',
    },
  });

  const checkInDate = form.watch('checkInDate');
  const nights = form.watch('nights');
  const pricePerNight = form.watch('pricePerNight');

  const checkOutDate = useMemo(() => addDays(checkInDate, Number(nights) || 0), [checkInDate, nights]);
  const totalAmount = useMemo(() => {
    const n = Number(nights) || 0;
    const p = Number(pricePerNight) || 0;
    return Math.round(n * p * 100) / 100;
  }, [nights, pricePerNight]);

  const selectedRoom = useMemo(() => {
    const val = form.watch('roomNumber')?.trim().toLowerCase();
    if (!val) return undefined;
    return rooms?.find((r) => r.number.toLowerCase() === val);
  }, [rooms, form.watch('roomNumber')]);

  const createGuest = useCreateGuest();
  const createRes = useCreateReservation();

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

  async function onSubmit(values: FormValues) {
    if (!employee) {
      toast({ title: 'خطأ', description: 'يجب تسجيل الدخول لإنشاء حجز', variant: 'destructive' });
      return;
    }

    const room = rooms?.find((r) => r.number.trim().toLowerCase() === values.roomNumber.trim().toLowerCase());
    if (!room) {
      form.setError('roomNumber', { message: 'لم يتم العثور على غرفة بهذا الرقم ضمن الغرف المتاحة' });
      return;
    }

    try {
      let guestId: number;
      const existingGuest = guests?.find(
        (g) => g.phone.trim() === values.guestPhone.trim() || g.name.trim().toLowerCase() === values.guestName.trim().toLowerCase()
      );

      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        const newGuest = await createGuest.mutateAsync({
          data: {
            name: values.guestName.trim(),
            phone: values.guestPhone.trim(),
            nationalId: values.guestPhone.trim(),
          },
        });
        guestId = (newGuest as { id: number }).id;
      }

      const computedCheckOut = addDays(values.checkInDate, values.nights);

      const created = await createRes.mutateAsync({
        data: {
          roomId: room.id,
          guestId,
          employeeId: employee.id,
          checkInDate: values.checkInDate,
          checkOutDate: computedCheckOut,
          totalAmount,
          paymentReceiptNumber: values.paymentReceiptNumber,
          receiptImageUrl: receiptImageUrl ?? undefined,
          notes: values.notes,
        },
      });

      setCreatedReservation({
        id: (created as ReservationDetail).id,
        guestName: values.guestName,
        guestPhone: values.guestPhone,
        roomNumber: room.number,
        roomType: room.type,
        checkInDate: values.checkInDate,
        checkOutDate: computedCheckOut,
        nights: values.nights,
        pricePerNight: values.pricePerNight,
        totalAmount,
        paymentReceiptNumber: values.paymentReceiptNumber,
        notes: values.notes,
        employeeName: employee.name,
        createdAt: (created as ReservationDetail).createdAt,
        status: (created as ReservationDetail).status,
      });

      toast({ title: 'نجاح', description: 'تم إنشاء الحجز بنجاح' });
    } catch (err) {
      toast({ title: 'خطأ', description: 'تعذر إنشاء الحجز', variant: 'destructive' });
      console.error(err);
    }
  }

  if (createdReservation) {
    return (
      <Layout>
        <PageHeader title="تم إنشاء الحجز" description="يمكنك الآن طباعة إيصال الحجز" />

        <div className="max-w-xl mx-auto">
          <div id="receipt-print-area" className="bg-card border border-card-border rounded-lg shadow-sm p-8 print:shadow-none print:border-0">
            <div className="text-center mb-6 border-b border-border pb-4">
              <h2 className="text-xl font-bold">فندق لاس فيجاس</h2>
              <p className="text-sm text-muted-foreground">إيصال حجز</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">رقم الحجز:</span><span className="font-mono">#{createdReservation.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">رقم إيصال الدفع:</span><span className="font-mono">{createdReservation.paymentReceiptNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">اسم الضيف:</span><span className="font-medium">{createdReservation.guestName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">رقم هاتف الضيف:</span><span>{createdReservation.guestPhone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">رقم الغرفة:</span><span>{createdReservation.roomNumber} {createdReservation.roomType ? `(${createdReservation.roomType})` : ''}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">تاريخ الدخول:</span><span>{createdReservation.checkInDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">عدد الليالي:</span><span>{createdReservation.nights}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">تاريخ الخروج:</span><span>{createdReservation.checkOutDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">سعر الليلة:</span><span>${createdReservation.pricePerNight.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2"><span>الإجمالي:</span><span>${createdReservation.totalAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">حالة الحجز:</span><span>{statusLabels[createdReservation.status] ?? createdReservation.status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">تاريخ إنشاء الحجز:</span><span>{formatDateTime(createdReservation.createdAt)}</span></div>
              {createdReservation.notes && (
                <div className="flex justify-between"><span className="text-muted-foreground">ملاحظات:</span><span>{createdReservation.notes}</span></div>
              )}
              {receiptPreview && (
                <div className="pt-4">
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
              <div className="flex justify-between border-t border-border pt-2 mt-2"><span className="text-muted-foreground">الموظف المسؤول:</span><span className="font-medium">{createdReservation.employeeName}</span></div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6 print:hidden">
            <Button variant="outline" onClick={() => setLocation('/reservations')}>العودة إلى الحجوزات</Button>
            <Button onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة الإيصال
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title="إنشاء حجز جديد" description="إضافة حجز غرفة لضيف جديد أو حالي" />

      <div className="max-w-2xl bg-card border border-card-border rounded-lg shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

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
                      {guests?.map((g) => (
                        <option key={g.id} value={g.name} />
                      ))}
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
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الغرفة</FormLabel>
                    <FormControl>
                      <Input placeholder="اختر من القائمة أو اكتب رقم الغرفة..." list="rooms-list" {...field} />
                    </FormControl>
                    <datalist id="rooms-list">
                      {rooms?.map((r) => (
                        <option key={r.id} value={r.number}>غرفة {r.number} ({r.type}) - ${r.pricePerNight}</option>
                      ))}
                    </datalist>
                    {selectedRoom && (
                      <FormDescription>
                        غرفة {selectedRoom.number} - {selectedRoom.type} - ${selectedRoom.pricePerNight} / الليلة
                      </FormDescription>
                    )}
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

              <FormField
                control={form.control}
                name="pricePerNight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر الليلة ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">المبلغ الإجمالي (تلقائي)</label>
                <Input value={`${totalAmount.toFixed(2)}`} disabled readOnly className="font-bold" />
              </div>

              <FormField
                control={form.control}
                name="paymentReceiptNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم إيصال الدفع</FormLabel>
                    <FormControl>
                      <Input placeholder="رقم الإيصال..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">الموظف المسؤول</label>
                <Input value={employee?.name ?? ''} disabled readOnly />
              </div>
            </div>

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
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الرفع... {progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="ml-2 h-4 w-4" />
                      رفع إيصال الدفع
                    </>
                  )}
                </Button>
                {receiptPreview && (
                  <div className="relative">
                    {receiptIsPdf ? (
                      <div className="h-16 w-16 flex flex-col items-center justify-center rounded border border-border bg-muted text-[10px] text-muted-foreground px-1 text-center">
                        <span className="font-semibold">PDF</span>
                        <span className="truncate max-w-full">{receiptFileName}</span>
                      </div>
                    ) : (
                      <img src={receiptPreview} alt="معاينة الإيصال" className="h-16 w-16 object-cover rounded border border-border" />
                    )}
                    <button
                      type="button"
                      onClick={clearReceiptImage}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {!receiptPreview && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    اختياري - JPG، PNG أو PDF
                  </span>
                )}
              </div>
            </div>

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

            <div className="flex justify-end gap-4 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setLocation('/reservations')}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createRes.isPending || createGuest.isPending}>
                {(createRes.isPending || createGuest.isPending) ? 'جاري الإنشاء...' : 'تأكيد الحجز'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
