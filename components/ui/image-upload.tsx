'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFile, deleteImage } from '@/actions/upload';
import { toast } from 'sonner';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    onRemove: (url: string) => void;
    label: string;
    className?: string;
}

export function ImageUpload({
    value,
    onChange,
    onRemove,
    label,
    className
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleUpload = async (file: File) => {
        if (!file) return;

        // Validate type (image only)
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate size (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadFile(formData);

            if (result.error || !result.url) {
                throw new Error(result.error || 'Upload failed');
            }

            // Update state with the local proxy URL
            onChange(result.url);
            toast.success('Image uploaded');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleUpload(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (value) {
            await deleteImage(value);
            onRemove(value);
            toast.success('Image removed');
        }
    };

    return (
        <div className={cn("w-full", className)}>
            <div className="mb-2 text-sm font-medium text-foreground">{label}</div>

            {value ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border bg-muted/30 group">
                    <img
                        src={value}
                        alt="Uploaded content"
                        className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px]">
                        <button
                            onClick={handleDelete}
                            className="bg-destructive/90 hover:bg-destructive text-white p-1.5 rounded-full transition-transform hover:scale-110"
                            type="button"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                        "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors cursor-pointer bg-muted/5 hover:bg-muted/10",
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                        isUploading && "pointer-events-none opacity-50"
                    )}
                >
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        disabled={isUploading}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file);
                        }}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-xs">Uploading...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                            <div className="p-2 bg-muted rounded-full">
                                <Upload className="w-4 h-4" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-medium text-foreground">
                                    Upload
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
