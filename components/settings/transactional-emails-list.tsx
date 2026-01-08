'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt, FileText } from "lucide-react";

interface TransactionalEmail {
    id: string;
    sender: string;
    subject: string;
    amount: string | null;
    currency: string | null;
    date: Date;
    category: string | null;
    summary: string | null;
}

interface TransactionalEmailsListProps {
    emails: TransactionalEmail[];
}

export function TransactionalEmailsList({ emails }: TransactionalEmailsListProps) {
    if (emails.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <p>No transactional emails synced yet.</p>
                <p className="text-sm mt-1">Connect Gmail and click Sync to get started.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {emails.map((email) => (
                        <TableRow key={email.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                                {format(new Date(email.date), 'MMM d, h:mm a')}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{email.sender}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={email.subject}>
                                        {email.subject}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm">{email.summary || 'No summary'}</span>
                                    {email.category && (
                                        <Badge variant="secondary" className="w-fit text-xs capitalize">
                                            {email.category}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {email.amount ? (
                                    `${email.currency || '$'} ${email.amount}`
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
