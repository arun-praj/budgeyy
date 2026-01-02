'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateTripImage } from '@/actions/trips';
import { uploadFile } from '@/actions/upload';
import { toast } from 'sonner';
import { Loader2, Upload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Preset background images from public folder
const PRESET_BACKGROUNDS = [
    '/background/alex-knight-wfwUpfVqrKU-unsplash.jpg',
    '/background/charles-forerunner-3fPXt37X6UQ-unsplash.jpg',
    '/background/clay-banks-fEVaiLwWvlU-unsplash.jpg',
    '/background/jake-blucker-SzNpyQMb8W4-unsplash.jpg',
    '/background/sean-pollock-PhYq704ffdA-unsplash.jpg',
    '/background/shigeki-wakabayashi-6nuz52vsbWc-unsplash.jpg',
    '/background/tim-mossholder-MNuPX3WXLEk-unsplash.jpg',
    '/background/upgraded-points-KVym2PAn1gA-unsplash.jpg',
    '/background/werner-sevenster-JuP0ZG0UNi0-unsplash.jpg',
    '/background/yuda-feby-dFmZAVFYqEo-unsplash.jpg',
    '/background/zugr-kmF_Aq8gkp0-unsplash.jpg',
];

interface BackgroundSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tripId: string;
    currentImage?: string | null;
}

export function BackgroundSelector({ open, onOpenChange, tripId, currentImage }: BackgroundSelectorProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(currentImage || null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handlePresetSelect = (url: string) => {
        setSelectedImage(url);
    };

    const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadFile(formData);

            if (result.error) {
                toast.error(result.error);
                return;
            }

            if (result.url) {
                setSelectedImage(result.url);
                toast.success('Image uploaded successfully');
            }
        } catch (error) {
            toast.error('Failed to upload image');
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedImage) {
            toast.error('Please select a background image');
            return;
        }

        setIsSaving(true);
        try {
            await updateTripImage(tripId, selectedImage);
            toast.success('Background updated successfully');
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to update background');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Change Background Image</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Preset Backgrounds */}
                    <div className="space-y-3">
                        <Label>Choose from presets</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {PRESET_BACKGROUNDS.map((bg) => (
                                <button
                                    key={bg}
                                    onClick={() => handlePresetSelect(bg)}
                                    className={cn(
                                        "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                                        selectedImage === bg ? "border-primary ring-2 ring-primary" : "border-muted"
                                    )}
                                >
                                    <img
                                        src={bg}
                                        alt="Background option"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            // Fallback for missing images
                                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23666" width="100" height="100"/></svg>';
                                        }}
                                    />
                                    {selectedImage === bg && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="bg-primary rounded-full p-2">
                                                <Check className="h-5 w-5 text-primary-foreground" />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Upload */}
                    <div className="space-y-3">
                        <Label htmlFor="custom-upload">Or upload your own</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="custom-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleCustomUpload}
                                disabled={isUploading}
                                className="cursor-pointer"
                            />
                            {isUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                        {selectedImage && !PRESET_BACKGROUNDS.includes(selectedImage) && (
                            <div className="mt-2 relative aspect-video w-full max-w-xs rounded-lg overflow-hidden border-2 border-primary">
                                <img
                                    src={selectedImage}
                                    alt="Selected background"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !selectedImage}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Background
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
