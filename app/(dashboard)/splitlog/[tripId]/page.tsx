import { notFound } from 'next/navigation';
import { getTrip } from '@/actions/trips';
import { format } from 'date-fns';
import { MapPin, Calendar, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotionAvatar } from '@/components/avatars/notion-avatar';
import { AvatarConfig } from '@/components/avatars/notion-avatar/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TripNotes } from '@/components/trips/trip-notes';
import { ItineraryTimeline } from '@/components/trips/itinerary-timeline';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { inArray, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface TripDetailsPageProps {
    params: {
        tripId: string;
    };
}

export default async function TripDetailsPage(props: TripDetailsPageProps) {
    const params = await props.params;
    const session = await auth.api.getSession({
        headers: await headers()
    });
    const trip = await getTrip(params.tripId);

    if (!trip || !session?.user) {
        notFound();
    }

    const hasImage = !!trip.imageUrl;
    const headerStyle = hasImage
        ? { backgroundImage: `url(${trip.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)' };

    // Helper to parse avatar config
    const getAvatarConfig = (avatarJson: string | null): AvatarConfig => {
        if (!avatarJson) return {
            body: 0, eyebrows: 0, eyes: 0, glass: 0, hair: 0, mouth: 0,
            accessory: 0, face: 0, beard: 0, detail: 0
        };
        try {
            return JSON.parse(avatarJson);
        } catch {
            return {
                body: 0, eyebrows: 0, eyes: 0, glass: 0, hair: 0, mouth: 0,
                accessory: 0, face: 0, beard: 0, detail: 0
            };
        }
    };



    // Fetch members (Creator + All Invitees)
    const invitedEmails = trip.invites.map(i => i.email.toLowerCase());
    const memberUsersMap = new Map<string, typeof trip.user>();

    if (invitedEmails.length > 0) {
        const invitedUsers = await db.query.users.findMany({
            where: inArray(users.email, invitedEmails)
        });
        invitedUsers.forEach(u => memberUsersMap.set(u.email, u));
    }

    // Reconstruct valid member list for Timeline (Creator + All Invitees)
    // We iterate through all invites.
    // If an invite matches a registered user (by email), we use the User object (isGuest: false).
    // If NO registered user exists, we create a Guest object using the invite data (isGuest: true).

    // Start with creator
    let memberUsers: { id: string; name: string | null; email: string; image?: string | null; isGuest?: boolean }[] = [{
        ...trip.user,
        image: trip.user.avatar,
        isGuest: false
    }];

    // Set of added emails to avoid duplicates if any (though logic handles uniqueness by invite/user)
    const addedEmails = new Set<string>([trip.user.email]);

    trip.invites.forEach(invite => {
        const email = invite.email.toLowerCase();
        if (addedEmails.has(email)) return;

        const registeredUser = memberUsersMap.get(email);
        if (registeredUser) {
            if (registeredUser.id !== trip.userId) {
                memberUsers.push({
                    ...registeredUser,
                    image: registeredUser.avatar, // Map avatar to image for consistency
                    isGuest: false
                });
                addedEmails.add(email);
            }
        } else {
            // It's a Guest!
            // Use invite.id as the ID for keys/db references
            memberUsers.push({
                id: invite.id, // Use Invite UUID
                name: email.split('@')[0], // Fallback name
                email: email,
                image: invite.guestAvatar || null,
                isGuest: true
            });
            addedEmails.add(email);
        }
    });

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 1. Header Background (10% of screen approx) */}
            <div
                className="relative h-[30vh] w-full"
                style={headerStyle}
            >
                <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="container max-w-5xl mx-auto px-4 -mt-16 relative z-10">
                {/* 3. Title Card covering overlap 80% to bg, 20% to content */}
                <div className="bg-card rounded-xl shadow-lg border p-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">

                    {/* Title and Date on Bottom Left */}
                    <div className="space-y-1">
                        <Badge variant="outline" className="mb-2 bg-background/50 backdrop-blur-sm">
                            <MapPin className="h-3 w-3 mr-1" />
                            {trip.destination}
                        </Badge>
                        <h1 className="text-3xl md:text-4xl font-bold">{trip.name}</h1>
                        <div className="flex items-center text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>
                                {trip.startDate ? format(trip.startDate, 'MMM d') : 'No Date'}
                                {trip.endDate ? ` - ${format(trip.endDate, 'MMM d, yyyy')}` : (trip.startDate ? `, ${format(trip.startDate, 'yyyy')}` : '')}
                            </span>
                        </div>
                    </div>

                    {/* Members with Notion Icons */}
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3 transition-all">
                            <TooltipProvider>
                                {/* Creator */}
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div className="relative h-10 w-10">
                                            <div className="h-full w-full rounded-full border-2 border-green-500 bg-muted overflow-hidden">
                                                <NotionAvatar config={getAvatarConfig(trip.user.avatar)} className="h-full w-full" />
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{trip.user.name || 'Creator'} (Creator)</p>
                                    </TooltipContent>
                                </Tooltip>

                                {/* Invited Members */}
                                {trip.invites && trip.invites.map((invite) => {
                                    const user = memberUsersMap.get(invite.email.toLowerCase());
                                    const avatarConfig = getAvatarConfig(user?.avatar || invite.guestAvatar || null);
                                    const displayName = user?.name || invite.email;
                                    const isJoined = invite.status === 'accepted';

                                    return (
                                        <Tooltip key={invite.email}>
                                            <TooltipTrigger>
                                                <div className="relative h-10 w-10 group">
                                                    <div className={`h-full w-full rounded-full border-2 ${isJoined ? 'border-green-500' : 'border-orange-400'} bg-muted overflow-hidden`}>
                                                        <NotionAvatar config={avatarConfig} className="h-full w-full" />
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{displayName} ({invite.status})</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </TooltipProvider>

                            {/* Invite Button */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="icon" variant="outline" className="rounded-full ml-2 h-10 w-10 border-dashed">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Invite friends</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>

                {/* 2. Information Page Below */}
                <div className="mt-8">
                    <Tabs defaultValue="itinerary" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                            <TabsTrigger value="expenses">Expenses</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Trip Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h3 className="font-medium text-muted-foreground mb-1">Description</h3>
                                        <p>{trip.description || 'No description added.'}</p>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <TripNotes tripId={trip.id} initialNotes={trip.notes} />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="itinerary" className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Itinerary</h2>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-1" /> Add Day
                                </Button>
                            </div>

                            <ItineraryTimeline
                                items={trip.itineraries}
                                tripId={trip.id}
                                members={memberUsers}
                                currentUser={session.user}
                            />
                        </TabsContent>

                        <TabsContent value="expenses">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold">Trip Expenses</h2>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-1" /> Add Expense
                                </Button>
                            </div>
                            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                                <p className="text-muted-foreground">No expenses recorded for this trip.</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
