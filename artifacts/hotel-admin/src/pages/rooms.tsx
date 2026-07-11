import { useState, useMemo, type FormEvent } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, StatusBadge } from '@/components/ui-custom';
import {
  useListRooms,
  useUpdateRoom,
  useListReservations,
  useCreateRoom,
  useDeleteRoom,
  getListRoomsQueryKey,
} from '@workspace/api-client-react';
import { BedDouble, Key, Wrench, Ban, Loader2, CalendarDays, Filter, X, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Room } from '@workspace/api-client-react';

// ────────────────────────────────────────────────
// Helper: YYYY-MM-DD string from Date
// ────────────────────────────────────────────────
const toYMD = (d: Date) => d.toISOString().slice(0, 10);

// ────────────────────────────────────────────────
// Reservations table shown inside the dialog
// ────────────────────────────────────────────────
function RoomReservationsTable({ roomId }: { roomId: number }) {
  const { data: reservations, isLoading } = useListReservations(
    { roomId },
    { query: { queryKey: ['room-reservations', roomId] } }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!reservations || reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <CalendarDays className="h-10 w-10 opacity-30" />
        <p className="text-sm">لا توجد حجوزات لهذه الغرفة</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="pb-3 font-medium">#</th>
            <th className="pb-3 font-medium">الضيف</th>
            <th className="pb-3 font-medium">تاريخ الدخول</th>
            <th className="pb-3 font-medium">تاريخ الخروج</th>
            <th className="pb-3 font-medium">الليالي</th>
            <th className="pb-3 font-medium">الإجمالي</th>
            <th className="pb-3 font-medium">الحالة</th>
            <th className="pb-3 font-medium">الموظف</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {reservations.map((res) => {
            const checkIn  = new Date(res.checkInDate);
            const checkOut = new Date(res.checkOutDate);
            const nights   = Math.round((checkOut.getTime() - checkIn.getTime()) / 864e5);
            return (
              <tr key={res.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-3 text-muted-foreground font-mono text-xs">{res.id}</td>
                <td className="py-3">
                  <div className="font-medium text-foreground">{res.guest?.name}</div>
                  <div className="text-xs text-muted-foreground">{res.guest?.phone}</div>
                </td>
                <td className="py-3 text-muted-foreground">{format(checkIn,  'dd MMM yyyy', { locale: ar })}</td>
                <td className="py-3 text-muted-foreground">{format(checkOut, 'dd MMM yyyy', { locale: ar })}</td>
                <td className="py-3 text-center font-mono">{nights}</td>
                <td className="py-3 font-mono font-medium text-primary">{res.totalAmount.toLocaleString()} ج.م</td>
                <td className="py-3"><StatusBadge status={res.status} /></td>
                <td className="py-3 text-muted-foreground text-xs">{res.employee?.name}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────
// Filter types
// ────────────────────────────────────────────────
type FilterMode = 'all' | 'week' | 'month' | 'custom';

// ────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────
export default function Rooms() {
  const { employee: currentEmployee } = useAuth();
  const isAdmin = currentEmployee?.role === 'admin';
  const { data: rooms, isLoading: roomsLoading }           = useListRooms();
  const { data: allReservations, isLoading: resLoading }   = useListReservations(
    {},
    { query: { queryKey: ['all-reservations-for-filter'] } }
  );

  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filterMode,   setFilterMode]   = useState<FilterMode>('all');
  const [customFrom,   setCustomFrom]   = useState('');
  const [customTo,     setCustomTo]     = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  const updateRoom = useUpdateRoom({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        toast({ title: 'تم التحديث', description: 'تم تحديث حالة الغرفة بنجاح' });
      },
    },
  });

  const deleteRoom = useDeleteRoom({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        toast({ title: 'تم حذف الغرفة' });
        setDeletingRoom(null);
      },
      onError: (err: unknown) => {
        toast({ title: 'حدث خطأ', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
        setDeletingRoom(null);
      },
    },
  });

  // ── compute period boundaries ──
  const period = useMemo((): { from: string; to: string } | null => {
    const today = new Date();
    if (filterMode === 'week') {
      return {
        from: toYMD(startOfWeek(today, { weekStartsOn: 6 })), // Sat–Fri (Arab week)
        to:   toYMD(endOfWeek(today,   { weekStartsOn: 6 })),
      };
    }
    if (filterMode === 'month') {
      return { from: toYMD(startOfMonth(today)), to: toYMD(endOfMonth(today)) };
    }
    if (filterMode === 'custom' && customFrom && customTo && customFrom <= customTo) {
      return { from: customFrom, to: customTo };
    }
    return null;
  }, [filterMode, customFrom, customTo]);

  // ── IDs of rooms that are busy in the selected period ──
  const busyRoomIds = useMemo((): Set<number> => {
    if (!period || !allReservations) return new Set();
    const busy = new Set<number>();
    for (const r of allReservations) {
      if (r.status === 'cancelled') continue;
      // overlap: r.checkIn < period.to  AND  r.checkOut > period.from
      if (r.checkInDate < period.to && r.checkOutDate > period.from) {
        busy.add(r.roomId);
      }
    }
    return busy;
  }, [period, allReservations]);

  // ── filtered rooms (available in the period) ──
  const visibleRooms = useMemo(() => {
    if (!rooms) return [];
    if (!period) return rooms;
    return rooms.filter((r) => !busyRoomIds.has(r.id));
  }, [rooms, period, busyRoomIds]);

  const isLoading = roomsLoading || resLoading;

  // ── icons ──
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':   return <Key     className="h-5 w-5 text-status-available"   />;
      case 'occupied':    return <BedDouble className="h-5 w-5 text-status-occupied"  />;
      case 'reserved':    return <Ban     className="h-5 w-5 text-status-reserved"    />;
      case 'maintenance': return <Wrench  className="h-5 w-5 text-status-maintenance" />;
      default:            return <BedDouble className="h-5 w-5"                       />;
    }
  };

  const handleStatusChange = (id: number, status: string) =>
    updateRoom.mutate({ id, data: { status } });

  const clearFilter = () => {
    setFilterMode('all');
    setCustomFrom('');
    setCustomTo('');
  };

  // ────────────────────────────────────────────────
  return (
    <Layout>
      <div className="flex items-center justify-between gap-4 mb-2">
        <PageHeader
          title="إدارة الغرف"
          description="مراقبة وتحديث حالة غرف الفندق — اضغط على أي غرفة لعرض حجوزاتها"
        />
        {isAdmin && (
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex-shrink-0">
            <Plus className="h-4 w-4 ml-1" /> إضافة غرفة
          </Button>
        )}
      </div>

      {/* ── Availability filter bar ── */}
      <div className="mb-6 bg-card border border-card-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">تصفية الغرف المتاحة خلال:</span>
          {filterMode !== 'all' && (
            <button
              onClick={clearFilter}
              className="mr-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" /> إلغاء التصفية
            </button>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { mode: 'all',    label: 'جميع الغرف'    },
              { mode: 'week',   label: 'هذا الأسبوع'   },
              { mode: 'month',  label: 'هذا الشهر'     },
              { mode: 'custom', label: 'فترة محددة'    },
            ] as { mode: FilterMode; label: string }[]
          ).map(({ mode, label }) => (
            <Button
              key={mode}
              size="sm"
              variant={filterMode === mode ? 'default' : 'outline'}
              onClick={() => setFilterMode(mode)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Custom date range inputs */}
        {filterMode === 'custom' && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">من:</label>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 w-40 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">إلى:</label>
              <Input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 w-40 text-sm"
              />
            </div>
            {customFrom && customTo && customFrom <= customTo && (
              <span className="text-xs text-muted-foreground">
                من {format(new Date(customFrom), 'dd MMM', { locale: ar })} إلى {format(new Date(customTo), 'dd MMM yyyy', { locale: ar })}
              </span>
            )}
          </div>
        )}

        {/* Period summary */}
        {period && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>
              عرض الغرف المتاحة من {format(new Date(period.from), 'dd MMM', { locale: ar })} إلى{' '}
              {format(new Date(period.to), 'dd MMM yyyy', { locale: ar })}
              {' — '}
              <span className="text-primary font-medium">
                {visibleRooms.length} غرفة متاحة
              </span>
              {' من أصل '}
              {rooms?.length ?? 0}
            </span>
          </div>
        )}
      </div>

      {/* ── Room grid ── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          جاري التحميل...
        </div>
      ) : visibleRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
          <BedDouble className="h-12 w-12 opacity-20" />
          <p className="text-sm">لا توجد غرف متاحة خلال هذه الفترة</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {visibleRooms.map((room) => (
            <div
              key={room.id}
              className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col transition-all hover:border-primary/50 hover:shadow-md cursor-pointer group relative"
              onClick={() => setSelectedRoom(room)}
            >
              {/* Header */}
              <div className="p-3 flex flex-col items-center gap-2 border-b border-border bg-muted/10 group-hover:bg-muted/20 transition-colors">
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingRoom(room); }}
                    className="absolute top-1.5 left-1.5 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="حذف الغرفة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="p-2 bg-background rounded-md border border-border shadow-sm">
                  {getStatusIcon(room.status)}
                </div>
                <div className="font-serif font-bold text-2xl text-primary">{room.number}</div>
                <StatusBadge status={room.status} />
              </div>

              {/* Quick status — stop propagation so it doesn't open dialog */}
              <div className="p-3" onClick={(e) => e.stopPropagation()}>
                <label className="text-xs text-muted-foreground mb-1 block">الحالة:</label>
                <Select
                  defaultValue={room.status}
                  onValueChange={(val) => handleStatusChange(room.id, val)}
                  disabled={updateRoom.isPending}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">متاح</SelectItem>
                    <SelectItem value="occupied">مشغول</SelectItem>
                    <SelectItem value="reserved">محجوز</SelectItem>
                    <SelectItem value="maintenance">صيانة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Room reservations dialog ── */}
      <Dialog
        open={!!selectedRoom}
        onOpenChange={(open) => { if (!open) setSelectedRoom(null); }}
      >
        <DialogContent className="max-w-5xl w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-md border border-border">
                {selectedRoom && getStatusIcon(selectedRoom.status)}
              </div>
              <div>
                <DialogTitle className="font-serif text-xl text-primary">
                  غرفة {selectedRoom?.number}
                </DialogTitle>
                <div className="mt-1">
                  {selectedRoom && <StatusBadge status={selectedRoom.status} />}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">سجل الحجوزات</h4>
            {selectedRoom && <RoomReservationsTable roomId={selectedRoom.id} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add room dialog ── */}
      <AddRoomDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

      {/* ── Delete room confirmation ── */}
      <AlertDialog open={!!deletingRoom} onOpenChange={(open) => !open && setDeletingRoom(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الغرفة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف غرفة {deletingRoom?.number}؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingRoom && deleteRoom.mutate({ id: deletingRoom.id })}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

// ────────────────────────────────────────────────
// Add room dialog
// ────────────────────────────────────────────────
function AddRoomDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [number, setNumber] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useCreateRoom({
    mutation: {
      onSuccess: () => {
        toast({ title: 'تم إضافة الغرفة بنجاح' });
        queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        setNumber('');
        setDescription('');
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        toast({ title: 'حدث خطأ', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
      },
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!number.trim()) return;
    createMutation.mutate({
      data: { number: number.trim(), description: description.trim() || undefined },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة غرفة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">رقم الغرفة</label>
            <Input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="مثال: 101"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">وصف (اختياري)</label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: غرفة مزدوجة بإطلالة على البحر"
            />
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري الإضافة...
              </>
            ) : (
              'إضافة الغرفة'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
