'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArchiveRestore, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { unarchiveTrip } from '@/actions/trips';
import { useRouter } from 'next/navigation';

interface ArchivedTripsListProps {
    initialTrips: any[];
}

export function ArchivedTripsList({ initialTrips }: ArchivedTripsListProps) {
    const router = useRouter();
    const [trips, setTrips] = useState(initialTrips);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleUnarchive = async (tripId: string) => {
        setLoadingId(tripId);
        try {
            await unarchiveTrip(tripId);
            setTrips(trips.filter(t => t.id !== tripId));
            toast.success('Trip restored successfully');
            router.refresh(); // Refresh page to update main trips list elsewhere if needed
        } catch (error) {
            toast.error('Failed to restore trip');
        } finally {
            setLoadingId(null);
        }
    };

    if (trips.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArchiveRestore className="h-5 w-5" />
                        Archived Trips
                    </CardTitle>
                    <CardDescription>
                        You don't have any archived trips.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArchiveRestore className="h-5 w-5" />
                    Archived Trips
                </CardTitle>
                <CardDescription>
                    Trips you have archived. Restore them to view and edit again.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {trips.map((trip) => (
                        <div key={trip.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                            <div className="flex-1 min-w-0 mr-4">
                                <div className="font-medium truncate">{trip.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <Calendar className="h-3 w-3" />
                                    {trip.startDate ? format(new Date(trip.startDate), 'MMM d, yyyy') : 'No date'}
                                    {trip.endDate && ` - ${format(new Date(trip.endDate), 'MMM d, yyyy')}`}
                                </div>
                                {trip.archivedAt && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Archived on {format(new Date(trip.archivedAt), 'MMM d, yyyy')}
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnarchive(trip.id)}
                                disabled={loadingId === trip.id}
                                className="shrink-0"
                            >
                                {loadingId === trip.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ArchiveRestore className="h-4 w-4 mr-2" />
                                )}
                                Restore
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
