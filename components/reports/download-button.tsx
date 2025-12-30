'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BudgetPdfDocument } from './budget-pdf';
import { useEffect, useState } from 'react';

export function DownloadBudgetButton({ data, currency = 'USD' }: { data: any; currency?: string }) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!data) return null;

    if (!isClient) {
        return (
            <Button variant="outline" size="sm" disabled className="gap-2">
                <Download className="h-4 w-4" />
                Loading...
            </Button>
        );
    }

    const fileName = `Budget_${data.monthLabel.replace(/\s/g, '_')}.pdf`;

    return (
        <PDFDownloadLink
            document={<BudgetPdfDocument data={data} currency={currency} />}
            fileName={fileName}
        >
            {/* @ts-ignore - render props type mismatch often happens with react-pdf */}
            {({ blob, url, loading, error }) => (
                <Button variant="outline" size="sm" disabled={loading} className="gap-2 px-2 sm:px-3">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">{loading ? 'Preparing...' : 'Download Report'}</span>
                </Button>
            )}
        </PDFDownloadLink>
    );
}
