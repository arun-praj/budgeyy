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
import { CreditCard, Receipt, FileText, X } from "lucide-react";
import { rejectEmailTransaction } from "@/actions/reject-transaction";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TransactionalEmail {
    id: string;
    sender: string;
    subject: string;
    amount: string | null;
    currency: string | null;
    date: Date;
    category: string | null;
    description: string; // Updated interface
}

import { VerifyTransactionDialog } from "@/components/transactions/verify-transaction-dialog";

interface TransactionalEmailsListProps {
    emails: TransactionalEmail[];
}

export function TransactionalEmailsList({ emails }: TransactionalEmailsListProps) {
    const router = useRouter();

    const handleReject = async (id: string) => {
        try {
            const result = await rejectEmailTransaction(id);
            if (result.error) throw new Error(result.error);
            toast.success("Transaction rejected");
            router.refresh();
        } catch (error) {
            toast.error("Failed to reject transaction");
        }
    };

    if (emails.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <p>No new transactional emails found.</p>
                <p className="text-sm mt-1">Connect Gmail and click Sync to check for new ones.</p>
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
                                    <span className="text-sm">{email.description || 'No description'}</span>
                                    {email.category && (
                                        <Badge variant="secondary" className="w-fit text-xs capitalize">
                                            {email.category}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                <div className="flex items-center justify-end gap-2">
                                    <span>
                                        {email.amount ? (
                                            `${email.currency || '$'} ${email.amount}`
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </span>

                                    <VerifyTransactionDialog
                                        email={email}
                                    />

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                        onClick={() => handleReject(email.id)}
                                        title="Reject"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
