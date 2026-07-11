import { Layout } from '@/components/layout';
import { PageHeader, StatusBadge } from '@/components/ui-custom';
import { useListRooms, useUpdateRoom } from '@workspace/api-client-react';
import { BedDouble, Key, Wrench, Ban } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function Rooms() {
  const { data: rooms, isLoading } = useListRooms();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        description="مراقبة وتحديث حالة غرف الفندق البالغ عددها 42"
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">جاري تحميل الغرف...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms?.map((room) => (
            <div key={room.id} className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col transition-all hover:border-primary/30">
              <div className="p-4 flex items-center justify-between border-b border-border bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-md border border-border shadow-sm">
                    {getStatusIcon(room.status)}
                  </div>
                  <div>
                    <div className="font-serif font-bold text-xl text-primary">{room.number}</div>
                  </div>
                </div>
                <StatusBadge status={room.status} />
              </div>
              
              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <div className="pt-4 border-t border-border mt-auto">
                  <label className="text-xs text-muted-foreground mb-1 block">تحديث الحالة السريعة:</label>
                  <Select 
                    defaultValue={room.status} 
                    onValueChange={(val) => handleStatusChange(room.id, val)}
                    disabled={updateRoom.isPending}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
