import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEV_EMAIL = 'demo@pethealth.local';
const DEV_PASSWORD = 'demo123456';

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return NextResponse.json(
      { error: 'Supabase service role not configured' },
      { status: 500 }
    );
  }

  const client = createClient(url, serviceRole);

  // Ensure the dev user exists and has the expected password
  const { data: listData, error: listError } = await client.auth.admin.listUsers({
    email: DEV_EMAIL,
    page: 1,
    perPage: 1,
  });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const existingUser = listData?.users?.[0];

  // If the user already exists, reset the password to the known dev value
  if (existingUser) {
    const { error: updateError } = await client.auth.admin.updateUserById(existingUser.id, {
      password: DEV_PASSWORD,
      email_confirm: true,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email: DEV_EMAIL, updated: true });
  }

  const { error } = await client.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { name: 'Demo User' },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: DEV_EMAIL, created: true });
}
