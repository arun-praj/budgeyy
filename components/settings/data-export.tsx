'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileJson, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportUserDataJSON, exportUserDataCSV } from '@/actions/export';

export function DataExport() {
    const [isExportingJSON, setIsExportingJSON] = useState(false);
    const [isExportingCSV, setIsExportingCSV] = useState(false);

    const handleExportJSON = async () => {
        setIsExportingJSON(true);
        try {
            const data = await exportUserDataJSON();
            downloadFile(data, 'budgeyy-export.json', 'application/json');
            toast.success('Data exported successfully');
        } catch (error) {
            toast.error('Failed to export data');
            console.error(error);
        } finally {
            setIsExportingJSON(false);
        }
    };

    const handleExportCSV = async () => {
        setIsExportingCSV(true);
        try {
            const data = await exportUserDataCSV();
            downloadFile(data, 'budgeyy-transactions.csv', 'text/csv');
            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error('Failed to export CSV');
            console.error(error);
        } finally {
            setIsExportingCSV(false);
        }
    };

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Data
                </CardTitle>
                <CardDescription>
                    Download a copy of your data for backup or use in other applications.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                        variant="outline"
                        onClick={handleExportJSON}
                        disabled={isExportingJSON || isExportingCSV}
                        className="flex-1 gap-2"
                    >
                        {isExportingJSON ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                        Export Backup (JSON)
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        disabled={isExportingJSON || isExportingCSV}
                        className="flex-1 gap-2"
                    >
                        {isExportingCSV ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                        Export Transactions (CSV)
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    * JSON export includes all your data (profile, trips, budgets) and is suitable for migrating to another account.
                    <br />
                    * CSV export contains a flat list of all your transactions and trip expenses.
                </p>
            </CardContent >
        </Card >
    );
}
