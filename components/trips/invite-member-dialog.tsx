'use client';

import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Mail, Loader2, Send } from 'lucide-react';
import { inviteMember } from '@/actions/trips';
import { toast } from 'sonner';

interface InviteMemberDialogProps {
    tripId: string;
}

export function InviteMemberDialog({ tripId }: InviteMemberDialogProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!email || !email.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            await inviteMember(tripId, email);
            toast.success(`Invitation sent to ${email}`);
            setOpen(false);
            setEmail('');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send invite');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" className="rounded-full ml-2 h-10 w-10 border-dashed">
                    <Plus className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[320px] p-4">
                <DropdownMenuLabel className="px-0 pt-0 pb-3 text-base font-semibold">
                    Invite Friends
                </DropdownMenuLabel>
                <form onSubmit={handleSubmit} className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex-1">
                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="email"
                            placeholder="Email address"
                            className="pl-9 h-9"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            required
                            autoFocus
                        />
                    </div>
                    <Button type="submit" size="sm" disabled={isLoading} className="h-9 px-3 shrink-0">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
