import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAttendanceSession,
  getStaffSession,
  isServerSupabaseConfigured,
  SAFE_EMPLOYEE_COLUMNS,
  sanitizeEmployee,
} from '@/lib/server/request-auth';

const AVATAR_BUCKET = 'employee-avatars';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function ensureAvatarBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: existing, error: getErr } = await admin.storage.getBucket(AVATAR_BUCKET);
  if (existing && !getErr) return;

  const { error: createErr } = await admin.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: MAX_AVATAR_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  if (createErr && !createErr.message?.toLowerCase().includes('already exists')) {
    throw new Error(`Gagal menyiapkan bucket Storage avatar: ${createErr.message}`);
  }
}

async function resolveTargetEmployeeId(requestedEmployeeId?: string | null): Promise<string | null> {
  const empSession = await getAttendanceSession();
  const staffSession = await getStaffSession();

  if (staffSession?.role === 'admin' && requestedEmployeeId) {
    return requestedEmployeeId;
  }
  if (empSession) {
    if (requestedEmployeeId && requestedEmployeeId !== empSession.id && staffSession?.role !== 'admin') {
      return null;
    }
    return empSession.id;
  }
  return null;
}

function parseDataUrlImage(dataUrl: string): { buffer: Buffer; mimeType: string; ext: string } | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const ext = ALLOWED_MIME_TYPES[mimeType];
  if (!ext) return null;
  const cleanBase64 = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  return { buffer, mimeType, ext };
}

export async function POST(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let requestedEmployeeId: string | null = null;
    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const empIdField = formData.get('employeeId');
      requestedEmployeeId = typeof empIdField === 'string' && empIdField.trim() ? empIdField.trim() : null;

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'File gambar avatar wajib disertakan.' }, { status: 400 });
      }
      const normalizedMime = file.type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : file.type.toLowerCase();
      if (!ALLOWED_MIME_TYPES[normalizedMime]) {
        return NextResponse.json({ error: 'Format foto harus JPG, PNG, atau WEBP.' }, { status: 400 });
      }
      mimeType = normalizedMime;
      ext = ALLOWED_MIME_TYPES[normalizedMime];
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await request.json().catch(() => ({}));
      requestedEmployeeId = typeof body?.employeeId === 'string' && body.employeeId.trim() ? body.employeeId.trim() : null;
      const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl.trim() : '';
      const parsed = parseDataUrlImage(dataUrl);
      if (!parsed) {
        return NextResponse.json({ error: 'Data gambar tidak valid (harus JPG/PNG/WEBP).' }, { status: 400 });
      }
      fileBuffer = parsed.buffer;
      mimeType = parsed.mimeType;
      ext = parsed.ext;
    }

    const targetEmployeeId = await resolveTargetEmployeeId(requestedEmployeeId);
    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Unauthorized. Silakan login terlebih dahulu.' }, { status: 401 });
    }

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'File gambar kosong.' }, { status: 400 });
    }
    if (fileBuffer.byteLength > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: 'Ukuran foto melebihi batas maksimal 2 MB.' }, { status: 400 });
    }

    const admin = createAdminClient();
    await ensureAvatarBucket(admin);

    // Clean up older avatar files in the employee's folder (best-effort)
    try {
      const { data: oldFiles } = await admin.storage.from(AVATAR_BUCKET).list(targetEmployeeId);
      if (oldFiles && oldFiles.length > 0) {
        const pathsToDelete = oldFiles
          .filter((item) => item.name)
          .map((item) => `${targetEmployeeId}/${item.name}`);
        if (pathsToDelete.length > 0) {
          await admin.storage.from(AVATAR_BUCKET).remove(pathsToDelete);
        }
      }
    } catch {
      // Non-fatal cleanup error
    }

    const objectPath = `${targetEmployeeId}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await admin.storage.from(AVATAR_BUCKET).upload(objectPath, fileBuffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || 'Gagal mengunggah avatar ke Supabase Storage.' },
        { status: 500 }
      );
    }

    const { data: urlData } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
    const publicUrl = urlData.publicUrl;

    const { data: updatedEmp, error: updateError } = await admin
      .from('employee_profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetEmployeeId)
      .select(SAFE_EMPLOYEE_COLUMNS)
      .single();

    if (updateError || !updatedEmp) {
      return NextResponse.json(
        { error: updateError?.message || 'Avatar terunggah tetapi gagal menyimpan URL ke profil karyawan.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      avatar_url: publicUrl,
      employee: sanitizeEmployee(updatedEmp),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan saat mengunggah avatar.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const requestedEmployeeId = searchParams.get('employeeId');
  const targetEmployeeId = await resolveTargetEmployeeId(requestedEmployeeId);

  if (!targetEmployeeId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    const { data: oldFiles } = await admin.storage.from(AVATAR_BUCKET).list(targetEmployeeId);
    if (oldFiles && oldFiles.length > 0) {
      const paths = oldFiles.filter((f) => f.name).map((f) => `${targetEmployeeId}/${f.name}`);
      if (paths.length > 0) {
        await admin.storage.from(AVATAR_BUCKET).remove(paths);
      }
    }
  } catch {
    // Non-fatal cleanup error
  }

  const { data: updatedEmp, error } = await admin
    .from('employee_profiles')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetEmployeeId)
    .select(SAFE_EMPLOYEE_COLUMNS)
    .single();

  if (error || !updatedEmp) {
    return NextResponse.json({ error: error?.message || 'Gagal menghapus avatar.' }, { status: 500 });
  }

  return NextResponse.json({ employee: sanitizeEmployee(updatedEmp) });
}
