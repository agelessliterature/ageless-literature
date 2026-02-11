import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const vendorId = formData.get('vendorId') as string;
    const productType = (formData.get('productType') as string) || 'product';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory structure: /uploads/{books|products}/{vendorId}/
    const uploadDir = join(
      process.cwd(),
      'public',
      'uploads',
      productType === 'book' ? 'books' : 'products',
      vendorId.toString(),
    );

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const originalName = file.name.split('.').slice(0, -1).join('.');
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const filename = `${timestamp}-${sanitizedName}-${randomStr}.${extension}`;
    const filepath = join(uploadDir, filename);

    // Save file
    await writeFile(filepath, buffer);

    // Return URL path structure
    const urlPath = productType === 'book' ? 'books' : 'products';
    const url = `/uploads/${urlPath}/${vendorId}/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      publicId: `${vendorId}/${filename}`,
      thumbnail: url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');
    const productType = searchParams.get('productType') || 'product';

    if (!publicId) {
      return NextResponse.json({ error: 'No publicId provided' }, { status: 400 });
    }

    const { unlink } = await import('fs/promises');
    const urlPath = productType === 'book' ? 'books' : 'products';
    const filepath = join(process.cwd(), 'public', 'uploads', urlPath, publicId);

    try {
      await unlink(filepath);
      return NextResponse.json({ success: true });
    } catch (error) {
      // File might not exist, return success anyway
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
