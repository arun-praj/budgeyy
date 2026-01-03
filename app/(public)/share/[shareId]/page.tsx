import { notFound } from 'next/navigation';
import { getPublicTrip } from '@/actions/trips';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NotionAvatar } from '@/components/avatars/notion-avatar';
import { AvatarConfig } from '@/components/avatars/notion-avatar/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TripNotes } from '@/components/trips/trip-notes';
import { ItineraryTimeline } from '@/components/trips/itinerary-timeline';
import { TripExpenses } from '@/components/trips/trip-expenses';
import { MemberAvatarAction } from '@/components/trips/member-avatar-action';

interface PublicTripPageProps {
    params: {
        shareId: string;
    };
}

export default async function PublicTripPage(props: PublicTripPageProps) {
    const params = await props.params;
    const trip = await getPublicTrip(params.shareId);

    if (!trip) {
        notFound();
    }

    const hasImage = !!trip.imageUrl;
    const headerStyle = hasImage
        ? { backgroundImage: `url(${trip.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)' };

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

    // Construct members list for public view (read-only)
    // For public view, we don't need complex guest logic, just display
    const memberUsers = [{
        ...trip.user,
        image: trip.user.avatar,
        isGuest: false
    }];

    // Add accepted invitees
    trip.invites.forEach(invite => {
        if (invite.status === 'accepted') {
            // In public view we might not have full user details joined easily unless getPublicTrip includes it
            // Let's assume invite has minimal info or we treat them as guests if user not expanded
            // Ideally getPublicTrip should expand user for accepted invites. 
            // Checking getPublicTrip... usually it might not fetch deeply.
            // But for now let's just show them as "Member"
            memberUsers.push({
                id: "guest-" + invite.id,
                name: invite.email.split('@')[0],
                email: invite.email,
                image: invite.guestAvatar,
                isGuest: true
            });
        }
    });

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header Background */}
            <div
                className="relative h-[30vh] w-full"
                style={headerStyle}
            >
                <div className="absolute inset-0 bg-black/10" />

                {/* No actions in header for public view */}
            </div>

            <div className="container max-w-5xl mx-auto px-4 -mt-16 relative z-10">
                {/* Title Card */}
                <div className="bg-card rounded-xl shadow-lg border p-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">

                    {/* Title and Date on Bottom Left */}
                    <div className="flex flex-col gap-2">
                        <div>
                            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
                                <MapPin className="h-3 w-3 mr-1" />
                                {trip.destination}
                            </Badge>
                        </div>
                        {/* Read-only Title */}
                        <h1 className={
                            "text-3xl md:text-4xl font-bold tracking-tight text-foreground transition-all duration-200 border-b-2 border-transparent px-1 -ml-1"
                        }>
                            {trip.name}
                        </h1>

                        {/* Read-only Date Range */}
                        {trip.startDate && (
                            <div className="flex items-center text-muted-foreground text-sm font-medium px-1">
                                <span>
                                    {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {trip.endDate && ` - ${new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                </span>
                            </div>
                        )}
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

                                {/* We can show other members if needed, but for public share usually just creator is key or simplified list */}
                            </TooltipProvider>
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-12">
                    {/* Overview Section */}
                    {trip.notes && (
                        <section id="overview">
                            <TripNotes tripId={trip.id} initialNotes={trip.notes} readOnly={true} />
                        </section>
                    )}

                    {/* Itinerary Section */}
                    <section id="itinerary" className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Itinerary</h2>
                        </div>

                        <ItineraryTimeline
                            items={trip.itineraries}
                            tripId={trip.id}
                            members={memberUsers}
                            currentUser={memberUsers[0]}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                            readOnly={true}
                        />
                    </section>

                    {/* Expenses Section - Optional for public, maybe just read only transactions? */}
                    {/* Keeping it simple for now, can reuse TripExpenses if we want to show budget */}
                    <section id="expenses" className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Trip Expenses</h2>
                        </div>
                        <TripExpenses
                            transactions={trip.tripTransactions || []}
                            members={memberUsers}
                            currency={'USD'} // Default for public view since we don't know viewer's pref
                        />
                    </section>
                </div>
            </div>
        </div>
    );
}
