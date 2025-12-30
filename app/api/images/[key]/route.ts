import { r2 } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string }> }
) {
    const { key } = await params;

    if (!process.env.R2_BUCKET_NAME) {
        return new NextResponse('R2_BUCKET_NAME not configured', { status: 500 });
    }

    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        const response = await r2.send(command);

        if (!response.Body) {
            return new NextResponse('Image not found', { status: 404 });
        }

        // Convert the body to a readable stream or buffer
        const bodyTypes = await response.Body.transformToByteArray();
        const buffer = Buffer.from(bodyTypes);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': response.ContentType || 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving image:', error);
        return new NextResponse('Image not found', { status: 404 });
    }
}
