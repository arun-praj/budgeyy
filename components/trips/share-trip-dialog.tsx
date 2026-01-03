'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '../ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Check, Globe, Lock } from 'lucide-react';
import { toggleTripPublic } from '@/actions/trips';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface ShareTripDialogProps {
    tripId: string;
    isPublic: boolean;
    shareId: string | null;
    showText?: boolean;
}

export function ShareTripDialog({ tripId, isPublic: initialIsPublic, shareId: initialShareId, showText = true }: ShareTripDialogProps) {
    const [isPublic, setIsPublic] = useState(initialIsPublic);
    const [shareId, setShareId] = useState(initialShareId);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/share/${shareId}`
        : '';

    const handleToggleSharing = async (checked: boolean) => {
        setIsLoading(true);
        try {
            const result = await toggleTripPublic(tripId, checked);
            setIsPublic(checked);
            if (result.shareId) {
                setShareId(result.shareId);
            }
            toast.success(checked ? 'Trip is now public' : 'Trip is now private');
        } catch (error) {
            toast.error('Failed to update sharing settings');
            setIsPublic(!checked); // Revert UI
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const triggerButton = (
        <Button
            variant="outline"
            size={showText ? "sm" : "icon"}
            className={cn("gap-2", !showText && "h-auto w-auto p-2 rounded-full bg-black/50 hover:bg-black/70 text-white border-0 backdrop-blur-sm")}
        >
            <Share2 className={cn("h-4 w-4", !showText && "h-5 w-5 text-white")} />
            {showText && "Share"}
        </Button>
    );

    return (
        <Dialog>
            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                {showText ? (
                    <DialogTrigger asChild>
                        {triggerButton}
                    </DialogTrigger>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DialogTrigger asChild>
                                    {triggerButton}
                                </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Share trip</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Share Trip</DialogTitle>
                    <DialogDescription>
                        Make your trip itinerary public so anyone can view it.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base flex items-center gap-2">
                                {isPublic ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                                Public Access
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Anyone with the link can view this trip.
                            </p>
                        </div>
                        <Switch
                            checked={isPublic}
                            onCheckedChange={handleToggleSharing}
                            disabled={isLoading}
                        />
                    </div>

                    {isPublic && shareId && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Label htmlFor="share-url">Share Link</Label>
                            <div className="flex space-x-2">
                                <Input
                                    id="share-url"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1"
                                />
                                <Button size="icon" onClick={copyToClipboard} variant="secondary">
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
