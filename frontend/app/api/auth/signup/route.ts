import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { name, email, password, timezone } = await request.json();
        const supabase = await createClient();

        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    timezone: timezone || 'UTC',
                },
            },
        });

        if (authError) {
            console.error('Auth signup error:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }

        // Step 2: Wait a moment for trigger to fire
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 3: Check if user row was created by trigger
        const { data: userRow, error: userCheckError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', authData.user.id)
            .maybeSingle();

        // If trigger didn't create user, create manually
        if (!userRow && !userCheckError) {
            const { error: insertError } = await supabase.from('users').insert({
                user_id: authData.user.id,
                name: name,
                email: email,
                timezone: timezone || 'UTC',
                role: 'user',
                is_active: true,
            });

            if (insertError) {
                console.error('Error inserting user row:', insertError);
                return NextResponse.json({ 
                    error: `Database error: ${insertError.message}. Please make sure you ran the database migration.` 
                }, { status: 500 });
            }
        }

        // Step 4: Verify user_settings was created by trigger
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', authData.user.id)
            .maybeSingle();

        if (!settings && !settingsError) {
            // Trigger didn't work, create manually
            const { error: manualSettingsError } = await supabase
                .from('user_settings')
                .insert({
                    user_id: authData.user.id,
                });

            if (manualSettingsError) {
                console.error('Error creating user_settings:', manualSettingsError);
            }
        }

        return NextResponse.json({ 
            user: authData.user, 
            session: authData.session,
            message: 'Signup successful! You can now use the extension.'
        });
    } catch (err: any) {
        console.error('Signup error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
