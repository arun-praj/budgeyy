'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { reactivateAccount } from '@/actions/user';

interface AccountStatusCheckerProps {
    status: 'active' | 'deactivated' | 'scheduled_for_deletion';
    scheduledDate?: Date | null;
}

export function AccountStatusChecker({ status, scheduledDate }: AccountStatusCheckerProps) {
    const hasChecked = useRef(false);

    useEffect(() => {
        if (hasChecked.current) return;
        if (status === 'active') return;

        const restoreAccount = async () => {
            hasChecked.current = true;

            try {
                const result = await reactivateAccount();

                if (result.success) {
                    if (status === 'scheduled_for_deletion') {
                        toast.success('Welcome back! Your account deletion has been cancelled.');
                    } else if (status === 'deactivated') {
                        toast.success('Welcome back! Your account has been reactivated.');
                    }
                }
            } catch (error) {
                console.error('Failed to reactivate account', error);
            }
        };

        restoreAccount();
    }, [status]);

    return null;
}
