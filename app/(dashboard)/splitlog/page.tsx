import { Suspense } from 'react';
import { getTrips } from '@/actions/trips';
import { Button } from '@/components/ui/button';
import { Map, MapPin } from 'lucide-react';
import { CreateTripDialog } from '@/components/trips/create-trip-dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { TripActionsDropdown } from '@/components/trips/trip-actions-dropdown';
import { ShareTripDialog } from '@/components/trips/share-trip-dialog';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export default function SplitlogPage() {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 pt-6 pb-24 md:pb-6">
            <Suspense fallback={<div>Loading trips...</div>}>
                <TripsContent />
            </Suspense>
        </div>
    );
}

async function TripsContent() {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    const trips = await getTrips();
    const hasTrips = trips.length > 0;

    if (!hasTrips) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
                <div className="p-6 rounded-full bg-primary/10">
                    <Map className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h2 className="text-2xl font-bold tracking-tight">No trips planned yet</h2>
                    <p className="text-muted-foreground">
                        Start planning your next adventure! Plan a trip to track expenses, manage itineraries, and share with friends.
                    </p>
                </div>
                <CreateTripDialog />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Splitlog</h1>
                    <p className="text-muted-foreground">
                        Your trips and shared expenses
                    </p>
                </div>
                <CreateTripDialog />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {trips.map((trip) => (
                    <Link key={trip.id} href={`/splitlog/${trip.id}`} className="block">
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                            <div className="relative h-48 w-full bg-muted">
                                {trip.imageUrl ? (
                                    <img
                                        src={trip.imageUrl}
                                        alt={trip.name}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <Map className="h-12 w-12 text-muted-foreground/30" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div
                                    className="absolute top-4 right-4 z-20 flex gap-2"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                >
                                    {trip.userId === session?.user?.id && (
                                        <>
                                            <ShareTripDialog
                                                tripId={trip.id}
                                                isPublic={trip.isPublic || false}
                                                shareId={trip.shareId || null}
                                                showText={false}
                                            />
                                            <TripActionsDropdown tripId={trip.id} tripName={trip.name} />
                                        </>
                                    )}
                                </div>
                                <div className="absolute bottom-4 left-4 text-white">
                                    <h3 className="font-bold text-lg">{trip.name}</h3>
                                    {trip.destination && (
                                        <div className="flex items-center text-sm text-white/90">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {trip.destination}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <CardContent className="pt-4 flex-1">
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {trip.description || 'No description provided.'}
                                </p>
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground border-t pt-4 flex justify-between mt-auto">
                                <span>{trip.startDate ? format(trip.startDate, 'MMM d, yyyy') : 'No Date'}</span>
                                {/* Placeholder for "days" or "participants" */}
                                <span>
                                    {trip.endDate && trip.startDate
                                        ? `${Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`
                                        : 'Ongoing'}
                                </span>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
