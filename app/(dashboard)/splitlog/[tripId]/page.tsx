import { notFound } from 'next/navigation';
import { getTrip } from '@/actions/trips';
import { MapPin, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BackgroundSelectorWrapper } from '@/components/trips/background-selector-wrapper';
import { EditableTitle } from '@/components/trips/editable-title';
import { EditableDateRange } from '@/components/trips/editable-date-range';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotionAvatar } from '@/components/avatars/notion-avatar';
import { AvatarConfig } from '@/components/avatars/notion-avatar/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TripNotes } from '@/components/trips/trip-notes';
import { ItineraryTimeline } from '@/components/trips/itinerary-timeline';
import { ShareTripDialog } from '@/components/trips/share-trip-dialog';
import { InviteMemberDialog } from '@/components/trips/invite-member-dialog';
import { MemberAvatarAction } from '@/components/trips/member-avatar-action';
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

    // Fetch full user to get currency preference (session might be stale or partial)
    let currentUser = session?.user;
    if (session?.user?.id) {
        const dbUser = await db.query.users.findFirst({
            where: eq(users.id, session.user.id)
        });
        if (dbUser) {
            currentUser = {
                ...dbUser,
                name: dbUser.name || session.user.name || 'User' // Ensure name is never null
            };
        }
    }

    if (!trip || !currentUser) {
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
                // Determine if they are effectively a guest (shadow user)
                // A shadow user isGuest=true in DB.
                const isGuestRole = registeredUser.isGuest;

                memberUsers.push({
                    ...registeredUser,
                    image: registeredUser.avatar || (registeredUser.image?.startsWith('{') ? registeredUser.image : null), // Map avatar (or fallback to image if legacy JSON) to image prop
                    isGuest: isGuestRole || false
                });
                addedEmails.add(email);
            }
        }
        // If no registered user found, that's an issue with sync (since we ensureShadowUser on create).
        // specific fallback not needed if backend guarantees user.
        // But for safety/legacy invites that might exist before migration:
        else {
            memberUsers.push({
                id: invite.id, // This is technically wrong if we want userId, but for legacy fallback ok. 
                // Ideally we should start migrating. 
                // But for now, let's assume getTrip includes users properly.
                // Actually getTrip logic doesn't eagerly load "Shadow Users" unless they are in `invitedUsers` query.
                // The `invitedUsers` query fetches by email. Shadow users HAVE the email.
                // So `registeredUser` SHOULD be found.
                // So this else block should rarely be hit if data is clean.
                name: email.split('@')[0],
                email: email,
                image: invite.guestAvatar || null,
                isGuest: true
            });
            addedEmails.add(email);
        }
    });

    const isCreator = trip.userId === currentUser.id;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 1. Header Background (10% of screen approx) */}
            <div
                className="relative h-[30vh] w-full"
                style={headerStyle}
            >
                <div className="absolute inset-0 bg-black/10" />

                {/* Back Button - Top Left */}
                <Link
                    href="/splitlog"
                    className="absolute top-4 left-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors backdrop-blur-sm"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="absolute top-4 right-4 z-20 flex gap-2">
                    {/* Share Button (Creator only) */}
                    {isCreator && (
                        <ShareTripDialog
                            tripId={trip.id}
                            isPublic={trip.isPublic}
                            shareId={trip.shareId}
                            showText={false}
                        />
                    )}

                    {/* Edit Background Button */}
                    <BackgroundSelectorWrapper tripId={params.tripId} currentImage={trip.imageUrl} />
                </div>
            </div>

            <div className="container max-w-5xl mx-auto px-4 -mt-16 relative z-10">
                {/* 3. Title Card covering overlap 80% to bg, 20% to content */}
                <div className="bg-card rounded-xl shadow-lg border p-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">

                    {/* Title and Date on Bottom Left */}
                    <div className="flex flex-col gap-2">
                        <div>
                            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
                                <MapPin className="h-3 w-3 mr-1" />
                                {trip.destination}
                            </Badge>
                        </div>
                        <EditableTitle tripId={trip.id} initialName={trip.name} />
                        <EditableDateRange
                            tripId={trip.id}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                        />
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
                                        <MemberAvatarAction
                                            key={invite.email}
                                            tripId={trip.id}
                                            email={invite.email}
                                            avatarConfig={avatarConfig}
                                            displayName={displayName}
                                            status={invite.status as 'pending' | 'accepted' | 'rejected'}
                                            isCreator={isCreator}
                                            isJoined={isJoined}
                                        />
                                    );
                                })}
                            </TooltipProvider>


                            {/* Invite Button */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <InviteMemberDialog tripId={trip.id} />
                                        </div>
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
                            </div>

                            <ItineraryTimeline
                                items={trip.itineraries}
                                tripId={trip.id}
                                members={memberUsers}
                                currentUser={currentUser}
                                startDate={trip.startDate}
                                endDate={trip.endDate}
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
