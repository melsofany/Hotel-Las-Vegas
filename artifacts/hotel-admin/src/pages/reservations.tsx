import { Layout } from '@/components/layout';
import { PageHeader, StatusBadge } from '@/components/ui-custom';
import { useListReservations, useCheckInReservation, useCheckOutReservation, useCancelReservation, useDeleteReservation } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, MoreHorizontal, CheckCircle, LogOut, XCircle, Trash, Edit, Eye } from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function Reservations() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: reservations, isLoading } = useListReservations({ status: statusFilter || undefined }, { query: { queryKey: ['reservations', statusFilter] } });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const checkIn = useCheckInReservation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        toast({ title: 'نجاح', description: 'تم تسجيل دخول الضيف بنجاح' });
      }
    }
  });

  const checkOut = useCheckOutReservation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        toast({ title: 'نجاح', description: 'تم تسجيل خروج الضيف بنجاح' });
      }
    }
  });

  const cancel = useCancelReservation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        toast({ title: 'نجاح', description: 'تم إلغاء الحجز بنجاح' });
      }
    }
  });

  const deleteRes = useDeleteReservation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        toast({ title: 'نجاح', description: 'تم حذف الحجز بنجاح' });
        setDeleteId(null);
      }
    }
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const statuses = [
    { value: '', label: 'الكل' },
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'confirmed', label: 'مؤكد' },
    { value: 'checked_in', label: 'تسجيل دخول' },
    { value: 'checked_out', label: 'تسجيل خروج' },
    { value: 'cancelled', label: 'ملغى' }
  ];

  return (
    <Layout>
      <PageHeader 
        title="إدارة الحجوزات" 
        description="عرض وإدارة جميع حجوزات الفندق"
        action={
          <Link href="/reservations/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              حجز جديد
            </Button>
          </Link>
        }
      />

      <div className="bg-card border border-card-border rounded-lg shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="بحث برقم الإيصال أو اسم الضيف..." 
              className="w-full bg-background border border-input rounded-md pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <select 
              className="w-full sm:w-auto bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-muted-foreground bg-muted/20 border-b border-border">
              <tr>
                <th className="p-4 font-medium">رقم الإيصال</th>
                <th className="p-4 font-medium">الضيف</th>
                <th className="p-4 font-medium">الغرفة</th>
                <th className="p-4 font-medium">تاريخ الحجز</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium">بواسطة</th>
                <th className="p-4 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">جاري التحميل...</td>
                </tr>
              ) : reservations?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد حجوزات تطابق البحث</td>
                </tr>
              ) : (
                reservations?.map((res) => (
                  <tr key={res.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="p-4 font-mono font-medium text-primary">{res.paymentReceiptNumber}</td>
                    <td className="p-4">
                      <div className="font-medium text-foreground">{res.guest?.name}</div>
                      <div className="text-xs text-muted-foreground">{res.guest?.phone}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center justify-center px-2 py-1 bg-secondary rounded text-secondary-foreground font-mono text-xs">
                        {res.room?.number}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <div className="flex flex-col">
                        <span>من: {format(new Date(res.checkInDate), 'dd MMM yyyy', { locale: ar })}</span>
                        <span>إلى: {format(new Date(res.checkOutDate), 'dd MMM yyyy', { locale: ar })}</span>
                      </div>
                    </td>
                    <td className="p-4"><StatusBadge status={res.status} /></td>
                    <td className="p-4 text-muted-foreground text-xs">{res.employee?.name}</td>
                    <td className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <span className="sr-only">فتح القائمة</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                          <DropdownMenuLabel>إجراءات الحجز</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {res.receiptImageUrl && (
                            <DropdownMenuItem onClick={() => window.open(`${import.meta.env.BASE_URL.replace(/\/$/, '')}api/storage${res.receiptImageUrl}`, '_blank', 'noopener,noreferrer')}>
                              <Eye className="mr-2 h-4 w-4 ml-2" />
                              <span>عرض إيصال الدفع</span>
                            </DropdownMenuItem>
                          )}

                          {(res.status === 'pending' || res.status === 'confirmed') && (
                            <DropdownMenuItem onClick={() => checkIn.mutate({ id: res.id })}>
                              <CheckCircle className="mr-2 h-4 w-4 text-status-checked-in ml-2" />
                              <span>تسجيل دخول</span>
                            </DropdownMenuItem>
                          )}
                          
                          {res.status === 'checked_in' && (
                            <DropdownMenuItem onClick={() => checkOut.mutate({ id: res.id })}>
                              <LogOut className="mr-2 h-4 w-4 text-status-checked-out ml-2" />
                              <span>تسجيل خروج</span>
                            </DropdownMenuItem>
                          )}
                          
                          {(res.status === 'pending' || res.status === 'confirmed') && (
                            <DropdownMenuItem onClick={() => cancel.mutate({ id: res.id })}>
                              <XCircle className="mr-2 h-4 w-4 text-status-cancelled ml-2" />
                              <span>إلغاء الحجز</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => setDeleteId(res.id)}>
                            <Trash className="mr-2 h-4 w-4 ml-2" />
                            <span>حذف السجل</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الحجز بشكل نهائي من النظام.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 justify-end">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deleteId && deleteRes.mutate({ id: deleteId })}
              disabled={deleteRes.isPending}
            >
              {deleteRes.isPending ? 'جاري الحذف...' : 'حذف نهائي'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
