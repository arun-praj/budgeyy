'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, MapPin, Plus, X, Mail } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { createTrip } from '@/actions/trips';
import { toast } from 'sonner';

const tripSchema = z.object({
    destination: z.string().min(1, 'Destination is required'),
    dateRange: z.object({
        from: z.date(),
        to: z.date().optional(),
    }).refine((data) => !!data.from, 'Start date is required'),
});

type TripFormValues = z.infer<typeof tripSchema>;

interface CreateTripDialogProps {
    trigger?: React.ReactNode;
}

export function CreateTripDialog({ trigger }: CreateTripDialogProps) {
    const [open, setOpen] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
    const [inviteInput, setInviteInput] = useState('');

    const form = useForm<TripFormValues>({
        resolver: zodResolver(tripSchema),
        defaultValues: {
            destination: '',
            // @ts-ignore
            dateRange: {
                from: undefined,
                to: undefined,
            }
        },
    });

    const isLoading = form.formState.isSubmitting;

    async function onSubmit(data: TripFormValues) {
        try {
            const tripId = await createTrip({
                name: `Trip to ${data.destination}`,
                destination: data.destination,
                startDate: data.dateRange.from,
                endDate: data.dateRange.to,
                emails: invitedEmails,
            });
            toast.success('Trip created successfully!');
            setOpen(false);
            form.reset();
            setInvitedEmails([]);
            setShowInvite(false);
            setInviteInput('');

            if (tripId) {
                // Force a hard redirect to ensure fresh state or use router.push if we import it
                window.location.href = `/splitlog/${tripId}`;
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to create trip. Please try again.');
        }
    }

    const addEmail = (email: string) => {
        if (email && !invitedEmails.includes(email)) {
            setInvitedEmails([...invitedEmails, email]);
        }
        setInviteInput('');
    };

    const removeEmail = (email: string) => {
        setInvitedEmails(invitedEmails.filter(e => e !== email));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button>Plan a new trip</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Plan a New Trip</DialogTitle>
                    <DialogDescription>
                        Enter details about your upcoming adventure.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="destination"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Destination (Where to?)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="e.g. Pokhara, Nepal" className="pl-10" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="dateRange"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Trip Dates</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    id="date"
                                                    variant={'outline'}
                                                    className={cn(
                                                        'w-full justify-start text-left font-normal',
                                                        !field.value?.from && 'text-muted-foreground'
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value?.from ? (
                                                        field.value.to ? (
                                                            <>
                                                                {format(field.value.from, 'LLL dd, y')} -{' '}
                                                                {format(field.value.to, 'LLL dd, y')}
                                                            </>
                                                        ) : (
                                                            format(field.value.from, 'LLL dd, y')
                                                        )
                                                    ) : (
                                                        <span>When&apos;s the adventure?</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={field.value?.from}
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                numberOfMonths={2}
                                                disabled={(date) =>
                                                    date < new Date('1900-01-01')
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Invite Tripmates Section */}
                        <div className="space-y-2">
                            {!showInvite && invitedEmails.length === 0 ? (
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto text-primary"
                                    onClick={() => setShowInvite(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Invite tripmates
                                </Button>
                            ) : (
                                <div className="space-y-2">
                                    <FormLabel>Tripmates</FormLabel>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {invitedEmails.map((email) => (
                                            <Badge key={email} variant="secondary" className="flex items-center gap-1">
                                                {email}
                                                <button
                                                    type="button"
                                                    onClick={() => removeEmail(email)}
                                                    className="ml-1 hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                    <Command className="border rounded-md">
                                        <CommandInput
                                            placeholder="Type email address..."
                                            value={inviteInput}
                                            onValueChange={setInviteInput}
                                        />
                                        {inviteInput.length > 0 && (
                                            <CommandList>
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={() => addEmail(inviteInput)}
                                                        className="cursor-pointer"
                                                        value={inviteInput}
                                                    >
                                                        <Mail className="mr-2 h-4 w-4" />
                                                        Send email to <span className="font-semibold ml-1">{inviteInput}</span>
                                                    </CommandItem>
                                                </CommandGroup>
                                            </CommandList>
                                        )}
                                    </Command>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Plan Trip
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
