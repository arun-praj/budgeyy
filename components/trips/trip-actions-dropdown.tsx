'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { archiveTrip, deleteTrip } from '@/actions/trips';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TripActionsDropdownProps {
    tripId: string;
    tripName: string;
}

export function TripActionsDropdown({ tripId, tripName }: TripActionsDropdownProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [isPermanent, setIsPermanent] = useState(false);

    async function handleAction() {
        setIsLoading(true);
        try {
            if (isPermanent) {
                const result = await deleteTrip(tripId);
                if (result.success) {
                    toast.success(`Trip "${tripName}" permanently deleted`);
                }
            } else {
                const result = await archiveTrip(tripId);
                if (result.success) {
                    toast.success(`Trip "${tripName}" archived`);
                }
            }
            setShowDialog(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Action failed');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowDialog(true);
                        }}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Trip
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Manage Trip: {tripName}</AlertDialogTitle>
                        <AlertDialogDescription>
                            How would you like to remove this trip? You can archive it for later or delete it permanently.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="flex flex-col gap-4 py-4">
                        <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg border border-transparent hover:border-border transition-colors cursor-pointer group" onClick={() => setIsPermanent(!isPermanent)}>
                            <Checkbox
                                id="permanent-delete"
                                checked={isPermanent}
                                onCheckedChange={(checked) => setIsPermanent(!!checked)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <Label
                                htmlFor="permanent-delete"
                                className="text-sm font-medium cursor-pointer flex-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Delete Permanently
                            </Label>
                        </div>

                        {isPermanent && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs flex items-start animate-in fade-in slide-in-from-top-1 duration-200">
                                <AlertTriangle className="h-4 w-4 mr-2 shrink-0 mt-0.5" />
                                <span><strong>Warning:</strong> All records associated with this trip (itineraries, expenses, notes) will be permanently deleted. This action cannot be undone.</span>
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading} onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAction();
                            }}
                            className={isPermanent ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : isPermanent ? (
                                'Delete Permanently'
                            ) : (
                                'Archive Trip'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
