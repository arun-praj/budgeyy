import { notFound } from 'next/navigation';
import { getPublicTrip } from '@/actions/trips';
import { MapPin, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotionAvatar } from '@/components/avatars/notion-avatar';
import { AvatarConfig } from '@/components/avatars/notion-avatar/types';
import { formatDate } from '@/lib/date-utils';
import { ItineraryTimeline } from '@/components/trips/itinerary-timeline';

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
    const memberUsers = [{
        ...trip.user,
        image: trip.user.avatar,
        isGuest: false
    }];

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header Background */}
            <div
                className="relative h-[40vh] w-full"
                style={headerStyle}
            >
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white space-y-4 px-4">
                        <Badge variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-white/30">
                            Public Itinerary
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight drop-shadow-lg">
                            {trip.name}
                        </h1>
                        <p className="text-xl md:text-2xl font-medium text-white/90 flex items-center justify-center gap-2">
                            <MapPin className="h-5 w-5" />
                            {trip.destination}
                        </p>
                    </div>
                </div>
            </div>

            <div className="container max-w-5xl mx-auto px-4 -mt-12 relative z-10">
                <Card className="shadow-xl border-t-0 rounded-t-none">
                    <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-6 border-b pb-8">
                        <div className="flex flex-col items-center md:items-start gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    {trip.startDate ? formatDate(trip.startDate, 'gregorian', 'long') : 'TBD'}
                                    {trip.endDate && ` - ${formatDate(trip.endDate, 'gregorian', 'long')}`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="h-8 w-8 rounded-full bg-muted overflow-hidden border">
                                    <NotionAvatar config={getAvatarConfig(trip.user.avatar)} className="h-full w-full" />
                                </div>
                                <span className="text-sm font-medium">Shared by {trip.user.name}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
                            <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Trip Purpose</p>
                            <p className="font-semibold text-lg">{trip.description || "Sightseeing & Exploration"}</p>
                        </div>
                    </CardHeader>

                    <div className="p-6">
                        <Tabs defaultValue="itinerary" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-8">
                                <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                                <TabsTrigger value="notes">Notes</TabsTrigger>
                            </TabsList>

                            <TabsContent value="itinerary" className="space-y-6">
                                <ItineraryTimeline
                                    items={trip.itineraries}
                                    tripId={trip.id}
                                    members={memberUsers}
                                    currentUser={memberUsers[0]} // Use creator as reference for read-only view
                                    startDate={trip.startDate}
                                    endDate={trip.endDate}
                                    readOnly={true}
                                />
                            </TabsContent>

                            <TabsContent value="notes">
                                <Card className="bg-muted/30 border-dashed">
                                    <CardContent className="pt-6">
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            {trip.notes ? (
                                                <div dangerouslySetInnerHTML={{ __html: trip.notes.replace(/\n/g, '<br/>') }} />
                                            ) : (
                                                <p className="text-muted-foreground italic text-center py-8">No public notes provided for this trip.</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </Card>

                <div className="mt-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                    <p className="text-sm">Made with <span className="text-primary font-bold">Budgeyy</span> - Simple Budgeting for Modern Travelers</p>
                    <a href="/" className="text-primary font-semibold hover:underline bg-primary/10 px-6 py-2 rounded-full">
                        Create Your Own Trip
                    </a>
                </div>
            </div>
        </div>
    );
}
