import { getSupabase } from './supabase-client.js';
import { API_URL, isNative } from './native.js';

export let currentUser = null;
export let currentProfile = null;

const REDIRECT_URL = isNative
    ? 'magicspin://auth/callback'
    : `${window.location.origin}/auth/callback`;

export async function initAuth() {
    const sb = await getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        currentProfile = await fetchOrCreateProfile(session.user);
    }
    sb.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            currentUser = session.user;
            currentProfile = await fetchOrCreateProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentProfile = null;
        }
    });
    return { user: currentUser, profile: currentProfile };
}

export async function signInWithGoogle() {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: REDIRECT_URL,
            queryParams: { access_type: 'offline', prompt: 'consent' },
        },
    });
    if (error) throw error;
}

export async function signOut() {
    const sb = await getSupabase();
    await sb.auth.signOut();
    currentUser = null;
    currentProfile = null;
}

export async function fetchOrCreateProfile(user) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    if (data) return data;
    // New user — profile will be created after username choice
    return null;
}

export async function createProfile({ userId, username, displayName, avatarUrl }) {
    const sb = await getSupabase();
    const { data, error } = await sb
        .from('profiles')
        .insert({
            id: userId,
            username: username.trim().toLowerCase(),
            display_name: displayName,
            avatar_url: avatarUrl,
        })
        .select()
        .single();
    if (error) throw error;
    currentProfile = data;
    return data;
}

export async function checkUsernameAvailable(username) {
    const sb = await getSupabase();
    const { data } = await sb
        .from('profiles')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .single();
    return !data;
}

export async function updateSoloRecord(timeSeconds, score) {
    if (!currentProfile) return;
    const isBetter = !currentProfile.solo_best_time || timeSeconds < currentProfile.solo_best_time;
    if (!isBetter) return;
    const sb = await getSupabase();
    const { data } = await sb
        .from('profiles')
        .update({ solo_best_time: timeSeconds, solo_best_score: score })
        .eq('id', currentProfile.id)
        .select()
        .single();
    if (data) currentProfile = data;
}

// Friends
export async function getFriends() {
    if (!currentProfile) return [];
    const sb = await getSupabase();
    const { data } = await sb
        .from('friendships')
        .select('*, friend:profiles!friendships_friend_id_fkey(id, username, display_name, avatar_url)')
        .eq('user_id', currentProfile.id)
        .eq('status', 'accepted');
    return data ?? [];
}

export async function sendFriendRequest(friendUsername) {
    if (!currentProfile) throw new Error('Not logged in');
    const sb = await getSupabase();
    const { data: friend } = await sb
        .from('profiles')
        .select('id')
        .eq('username', friendUsername.trim().toLowerCase())
        .single();
    if (!friend) throw new Error('Utente non trovato');
    if (friend.id === currentProfile.id) throw new Error('Non puoi aggiungere te stesso');
    const { error } = await sb.from('friendships').insert({
        user_id: currentProfile.id,
        friend_id: friend.id,
        status: 'pending',
    });
    if (error) throw error;
}

export async function acceptFriendRequest(requesterId) {
    const sb = await getSupabase();
    await sb.from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', requesterId)
        .eq('friend_id', currentProfile.id);
    // Create reverse entry so both can query
    await sb.from('friendships').insert({
        user_id: currentProfile.id,
        friend_id: requesterId,
        status: 'accepted',
    });
}

export async function getPendingRequests() {
    if (!currentProfile) return [];
    const sb = await getSupabase();
    const { data } = await sb
        .from('friendships')
        .select('*, requester:profiles!friendships_user_id_fkey(id, username, display_name, avatar_url)')
        .eq('friend_id', currentProfile.id)
        .eq('status', 'pending');
    return data ?? [];
}
