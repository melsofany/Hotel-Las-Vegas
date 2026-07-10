import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/ui-custom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet, Info } from 'lucide-react';
import { useState } from 'react';

export default function Export() {
  const [status, setStatus] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `/api/reservations/export/csv${params.toString() ? `?${params.toString()}` : ''}`;
      
      // We use a direct fetch because we want to trigger a browser download
      // Orval hooks expect JSON back usually, so downloading a blob is simpler manually
      const response = await fetch(url);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `reservations_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to export', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="تصدير البيانات" description="تصدير بيانات الحجوزات إلى ملف CSV للتحليل الخارجي" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-card-border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-serif font-bold mb-6 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            تصدير الحجوزات
          </h3>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>تصفية حسب الحالة</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="confirmed">مؤكد</SelectItem>
                  <SelectItem value="checked_in">تم تسجيل الدخول</SelectItem>
                  <SelectItem value="checked_out">تم تسجيل الخروج</SelectItem>
                  <SelectItem value="cancelled">ملغى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <Button 
              className="w-full gap-2 mt-4" 
              size="lg" 
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-5 w-5" />
              {isExporting ? 'جاري التحضير للتحميل...' : 'تنزيل ملف CSV'}
            </Button>
          </div>
        </div>

        <div className="bg-secondary/30 border border-secondary rounded-lg p-6 h-fit">
          <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2 text-foreground">
            <Info className="h-5 w-5 text-primary" />
            استيراد إلى Google Sheets
          </h3>
          <div className="text-sm text-muted-foreground space-y-4">
            <p>للحصول على أفضل تنسيق عند فتح الملف في Google Sheets:</p>
            <ol className="list-decimal list-inside space-y-2 pr-4 marker:text-primary">
              <li>قم بإنشاء جدول بيانات جديد في Google Sheets.</li>
              <li>اذهب إلى <strong>ملف (File)</strong> &gt; <strong>استيراد (Import)</strong>.</li>
              <li>اختر علامة التبويب <strong>تحميل (Upload)</strong> واسحب الملف الذي تم تنزيله.</li>
              <li>في نافذة الاستيراد، اختر <strong>نوع الفاصل: فاصلة (Comma)</strong>.</li>
              <li>اضغط على <strong>استيراد البيانات (Import data)</strong>.</li>
            </ol>
            <div className="bg-background border border-border p-3 rounded mt-4 text-xs">
              <strong>ملاحظة:</strong> إذا فتحت الملف في Excel وظهرت النصوص العربية برموز غريبة، يرجى استيراد الملف باستخدام (Data &gt; From Text/CSV) واختيار الترميز UTF-8.
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
