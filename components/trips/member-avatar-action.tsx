'use client';

import { useState } from 'react';
import { NotionAvatar } from '@/components/avatars/notion-avatar';
import { AvatarConfig } from '@/components/avatars/notion-avatar/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Loader2, MoreHorizontal } from 'lucide-react';
import { removeMember } from '@/actions/trips';
import { toast } from 'sonner';

interface MemberAvatarActionProps {
    tripId: string;
    email: string;
    avatarConfig: AvatarConfig | null;
    displayName: string;
    status: 'pending' | 'accepted' | 'rejected';
    isCreator: boolean;
    isJoined: boolean;
}

export function MemberAvatarAction({
    tripId,
    email,
    avatarConfig,
    displayName,
    status,
    isCreator,
    isJoined
}: MemberAvatarActionProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleRemove = async () => {
        setIsLoading(true);
        try {
            await removeMember(tripId, email);
            toast.success(`Removed ${displayName} from trip`);
        } catch (error) {
            toast.error('Failed to remove member');
        } finally {
            setIsLoading(false);
        }
    };

    const avatar = (
        <div className={`relative h-10 w-10 cursor-pointer transition-transform hover:scale-105`}>
            <div className={`h-full w-full rounded-full border-2 ${isJoined ? 'border-green-500' : 'border-orange-400'} bg-muted overflow-hidden`}>
                <NotionAvatar config={avatarConfig} className="h-full w-full" />
            </div>
            {isCreator && (
                <div className="absolute -bottom-1 -right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-3 h-3 text-white" />
                </div>
            )}
        </div>
    );

    if (!isCreator) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {/* Static avatar for non-creators */}
                        <div className="relative h-10 w-10">
                            <div className={`h-full w-full rounded-full border-2 ${isJoined ? 'border-green-500' : 'border-orange-400'} bg-muted overflow-hidden`}>
                                <NotionAvatar config={avatarConfig} className="h-full w-full" />
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{displayName} ({status})</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <DropdownMenu>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            {avatar}
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{displayName} ({status}) - Click to manage</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <DropdownMenuContent align="center">
                <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRemove();
                    }}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Remove from Trip
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
