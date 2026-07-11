import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, StatusBadge } from '@/components/ui-custom';
import { useListRooms, useUpdateRoom, useListReservations } from '@workspace/api-client-react';
import { BedDouble, Key, Wrench, Ban, Loader2, CalendarDays, X } from 'lucide-react';
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
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Room } from '@workspace/api-client-react';

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
            const checkIn = new Date(res.checkInDate);
            const checkOut = new Date(res.checkOutDate);
            const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <tr key={res.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-3 text-muted-foreground font-mono text-xs">{res.id}</td>
                <td className="py-3">
                  <div className="font-medium text-foreground">{res.guest?.name}</div>
                  <div className="text-xs text-muted-foreground">{res.guest?.phone}</div>
                </td>
                <td className="py-3 text-muted-foreground">
                  {format(checkIn, 'dd MMM yyyy', { locale: ar })}
                </td>
                <td className="py-3 text-muted-foreground">
                  {format(checkOut, 'dd MMM yyyy', { locale: ar })}
                </td>
                <td className="py-3 text-center font-mono">{nights}</td>
                <td className="py-3 font-mono font-medium text-primary">
                  {res.totalAmount.toLocaleString()} ر.س
                </td>
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

export default function Rooms() {
  const { data: rooms, isLoading } = useListRooms();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const updateRoom = useUpdateRoom({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        toast({ title: 'تم التحديث', description: 'تم تحديث حالة الغرفة بنجاح' });
      }
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <Key className="h-5 w-5 text-status-available" />;
      case 'occupied': return <BedDouble className="h-5 w-5 text-status-occupied" />;
      case 'reserved': return <Ban className="h-5 w-5 text-status-reserved" />;
      case 'maintenance': return <Wrench className="h-5 w-5 text-status-maintenance" />;
      default: return <BedDouble className="h-5 w-5" />;
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    updateRoom.mutate({ id, data: { status } });
  };

  return (
    <Layout>
      <PageHeader
        title="إدارة الغرف"
        description="مراقبة وتحديث حالة غرف الفندق البالغ عددها 42 — اضغط على أي غرفة لعرض حجوزاتها"
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin ml-2" />
          جاري تحميل الغرف...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {rooms?.map((room) => (
            <div
              key={room.id}
              className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col transition-all hover:border-primary/50 hover:shadow-md cursor-pointer group"
              onClick={() => setSelectedRoom(room)}
            >
              {/* Card header */}
              <div className="p-3 flex flex-col items-center gap-2 border-b border-border bg-muted/10 group-hover:bg-muted/20 transition-colors">
                <div className="p-2 bg-background rounded-md border border-border shadow-sm">
                  {getStatusIcon(room.status)}
                </div>
                <div className="font-serif font-bold text-2xl text-primary">{room.number}</div>
                <StatusBadge status={room.status} />
              </div>

              {/* Quick status update — stop click propagation so it doesn't open the dialog */}
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

      {/* Room reservations dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={(open) => { if (!open) setSelectedRoom(null); }}>
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
    </Layout>
  );
}
