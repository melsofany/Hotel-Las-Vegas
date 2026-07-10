import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/ui-custom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListRooms, useListGuests, useListEmployees, useCreateReservation } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  roomId: z.coerce.number({ required_error: "يرجى اختيار الغرفة" }),
  guestId: z.coerce.number({ required_error: "يرجى اختيار الضيف" }),
  employeeId: z.coerce.number({ required_error: "يرجى اختيار الموظف" }),
  checkInDate: z.string().min(1, "تاريخ الدخول مطلوب"),
  checkOutDate: z.string().min(1, "تاريخ الخروج مطلوب"),
  paymentReceiptNumber: z.string().min(1, "رقم الإيصال مطلوب"),
  totalAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewReservation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: rooms } = useListRooms({ status: 'available' });
  const { data: guests } = useListGuests();
  const { data: employees } = useListEmployees();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentReceiptNumber: `REC-${Math.floor(Math.random() * 100000)}`,
      notes: '',
    },
  });

  const createRes = useCreateReservation({
    mutation: {
      onSuccess: () => {
        toast({ title: 'نجاح', description: 'تم إنشاء الحجز بنجاح' });
        setLocation('/reservations');
      },
      onError: (err) => {
        toast({ title: 'خطأ', description: 'تعذر إنشاء الحجز', variant: 'destructive' });
        console.error(err);
      }
    }
  });

  function onSubmit(values: FormValues) {
    createRes.mutate({ data: values });
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
                name="guestId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الضيف</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الضيف..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {guests?.map(g => (
                          <SelectItem key={g.id} value={g.id.toString()}>{g.name} - {g.phone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الغرفة المتاحة</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الغرفة..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms?.map(r => (
                          <SelectItem key={r.id} value={r.id.toString()}>غرفة {r.number} ({r.type}) - ${r.pricePerNight}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                name="checkOutDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الخروج</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ الإجمالي ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="اتركه فارغاً للحساب التلقائي..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموظف المسؤول</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الموظف..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map(e => (
                          <SelectItem key={e.id} value={e.id.toString()}>{e.name} ({e.role})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" disabled={createRes.isPending}>
                {createRes.isPending ? 'جاري الإنشاء...' : 'تأكيد الحجز'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
