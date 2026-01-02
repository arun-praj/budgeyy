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
import { checkUserForInvite } from '@/actions/user';
import { NotionAvatar } from '@/components/avatars/notion-avatar';
import { AvatarConfig } from '@/components/avatars/notion-avatar/types';

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

interface InvitedUser {
    email: string;
    avatar: string | null; // JSON string
    exists: boolean;
}

const generateRandomAvatar = (): string => {
    const config = {
        body: Math.floor(Math.random() * 29),
        eyebrows: Math.floor(Math.random() * 10),
        eyes: Math.floor(Math.random() * 10),
        glass: Math.floor(Math.random() * 5),
        hair: Math.floor(Math.random() * 30),
        mouth: Math.floor(Math.random() * 10),
        accessory: Math.floor(Math.random() * 10),
        face: Math.floor(Math.random() * 10),
        beard: Math.floor(Math.random() * 10),
        detail: Math.floor(Math.random() * 10),
    };
    return JSON.stringify(config);
};

// Helper to parse avatar config safely
const parseAvatarConfig = (json: string | null): AvatarConfig => {
    if (!json) return generateRandomAvatarObject();
    try {
        return JSON.parse(json);
    } catch {
        return generateRandomAvatarObject();
    }
}

const generateRandomAvatarObject = () => JSON.parse(generateRandomAvatar());

export function CreateTripDialog({ trigger }: CreateTripDialogProps) {
    const [open, setOpen] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
    const [inviteInput, setInviteInput] = useState('');
    const [isCheckingUser, setIsCheckingUser] = useState(false);

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
                invites: invitedUsers.map(u => ({
                    email: u.email,
                    guestAvatar: !u.exists && u.avatar ? u.avatar : undefined
                })),
            });
            toast.success('Trip created successfully!');
            setOpen(false);
            form.reset();
            setInvitedUsers([]);
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

    const addEmail = async (rawEmail: string) => {
        const email = rawEmail.toLowerCase().trim();
        if (!email) return;

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        if (invitedUsers.some(u => u.email === email)) {
            setInviteInput('');
            return;
        }

        setIsCheckingUser(true);
        try {
            const result = await checkUserForInvite(email);

            const avatar = result.exists
                ? result.avatar
                : generateRandomAvatar();

            setInvitedUsers([...invitedUsers, {
                email,
                avatar,
                exists: result.exists
            }]);
        } catch (e) {
            // Fallback
            setInvitedUsers([...invitedUsers, {
                email,
                avatar: generateRandomAvatar(),
                exists: false
            }]);
        } finally {
            setIsCheckingUser(false);
            setInviteInput('');
        }
    };

    const removeUser = (email: string) => {
        setInvitedUsers(invitedUsers.filter(u => u.email !== email));
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
                            {!showInvite && invitedUsers.length === 0 ? (
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

                                    {/* Invited Use List */}
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {invitedUsers.map((user) => (
                                            <Badge key={user.email} variant="secondary" className="flex items-center gap-2 py-1 pl-1 pr-2">
                                                <div className="h-6 w-6 rounded-full bg-background border overflow-hidden">
                                                    <NotionAvatar
                                                        config={parseAvatarConfig(user.avatar)}
                                                        className="h-full w-full"
                                                    />
                                                </div>
                                                <span>{user.email}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeUser(user.email)}
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
                                                        disabled={isCheckingUser}
                                                    >
                                                        {isCheckingUser ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Mail className="mr-2 h-4 w-4" />
                                                        )}
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
