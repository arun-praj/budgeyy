'use server';

import { r2 } from '@/lib/r2';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export async function uploadFile(formData: FormData) {
    if (!process.env.R2_BUCKET_NAME) {
        return { error: 'R2_BUCKET_NAME is not defined' };
    }

    const file = formData.get('file') as File;
    if (!file) {
        return { error: 'No file provided' };
    }

    const fileType = file.type;
    const fileId = randomUUID();
    const extension = fileType.split('/')[1];
    const fileName = `${fileId}.${extension}`;

    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        const putCommand = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: fileType,
        });

        await r2.send(putCommand);

        return {
            success: true,
            key: fileName,
            url: `/api/images/${fileName}`,
        };
    } catch (error) {
        console.error('Upload error:', error);
        return { error: 'Failed to upload file' };
    }
}

export async function deleteImage(fileKey: string) {
    if (!process.env.R2_BUCKET_NAME) {
        return { error: 'R2_BUCKET_NAME is not defined' };
    }

    try {
        // Extract key if a full URL was passed
        const key = fileKey.includes('/api/images/') ? fileKey.split('/api/images/')[1] : fileKey;

        const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        await r2.send(command);
        return { success: true };
    } catch (err) {
        console.error('Delete error:', err);
        return { error: 'Failed to delete image' };
    }
}
