import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export interface MemoryMetadata {
  title: string;
  content: string;
  category: 'Travel' | 'Nature' | 'Relationship' | 'Tech' | 'Life';
  color: string;
  room?: string; // Packed room code for temporary timelines
  tags?: string[]; // Custom tags for searching later
}

export interface Memory {
  id: string;
  created_at: string;
  text: string; // Packed JSON payload
  image_url: string | null;
  date: string; // User-provided event date
  user_id: string | null;
  folder_id: string | null; // Shared folder scoping
  parsed: MemoryMetadata; // Decoded metadata fields
}

/**
 * Utility to safely parse JSON metadata from the text column,
 * falling back gracefully to raw text if parsing fails.
 */
export function parseMemoryText(text: string): MemoryMetadata {
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object') {
      return {
        title: data.title || 'Untitled Memory',
        content: data.content || '',
        category: data.category || 'Life',
        color: data.color || '#00f2fe',
        room: data.room || undefined,
        tags: data.tags || [],
      };
    }
  } catch (e) {
    // Graceful fallback for legacy or plain text data
  }
  
  return {
    title: text.length > 25 ? text.substring(0, 22) + '...' : text || 'Untitled Memory',
    content: text || '',
    category: 'Life',
    color: '#7f00ff', // Premium purple fallback
    tags: [],
  };
}

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Scoping & Friendship States ---
  const [friendships, setFriendships] = useState<any[]>([]);
  const [sharedFolders, setSharedFolders] = useState<any[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // 1. Initial Authentication & User Fetch
  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && active) {
          setUser(currentUser);
        } else {
          // Fallback check session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && active) {
            setUser(session.user);
          }
        }
      } catch (err) {
        console.error('Auth fetch failed:', err);
      }
    };

    checkAuth();

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && active) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT' && active) {
        setUser(null);
        setMemories([]);
        setFriendships([]);
        setSharedFolders([]);
        setActiveFolderId(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch scoped memories when activeFolderId or user changes
  const fetchMemories = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('memories')
        .select('*');
        
      if (activeFolderId) {
        query = query.eq('folder_id', activeFolderId);
      } else {
        query = query.is('folder_id', null);
      }
      
      const { data, error: fetchError } = await query.order('date', { ascending: false });
      if (fetchError) throw fetchError;
      
      const formatted = (data || []).map((m: any) => ({
        ...m,
        parsed: parseMemoryText(m.text),
      }));
      setMemories(formatted);
    } catch (err: any) {
      console.error('Fetch memories failed:', err);
      setError(err.message || 'Failed to fetch memories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMemories();
    }
  }, [activeFolderId, user]);

  // 3. Subscribe to memories real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime_memories_scoped')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memories' },
        (payload) => {
          // Only sync if memory matches our active scoping
          const isTargetInsertOrUpdate = 
            payload.eventType === 'INSERT' || payload.eventType === 'UPDATE';
          
          if (isTargetInsertOrUpdate) {
            const memory = payload.new as any;
            const matchesFolder = activeFolderId 
              ? memory.folder_id === activeFolderId
              : !memory.folder_id;
              
            if (matchesFolder) {
              const formatted: Memory = {
                ...memory,
                parsed: parseMemoryText(memory.text),
              };
              
              setMemories((prev) => {
                if (payload.eventType === 'INSERT') {
                  const updated = [formatted, ...prev];
                  return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                } else {
                  return prev.map((m) => (m.id === formatted.id ? formatted : m));
                }
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setMemories((prev) => prev.filter((m) => m.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeFolderId, user]);

  // 4. Fetch Friendships & Shared Folders
  const fetchFriendshipsAndFolders = async () => {
    if (!user) return;
    try {
      // Pull friendships
      const { data: friendData, error: friendError } = await supabase
        .from('friendships')
        .select('*');
      if (friendError) throw friendError;
      
      // Pull folders user belongs to via folder_members relation
      const { data: memberData, error: memberError } = await supabase
        .from('folder_members')
        .select(`
          folder_id,
          shared_folders (
            id,
            folder_name,
            created_at
          )
        `);
      if (memberError) throw memberError;
      
      const folders = (memberData || [])
        .map((m: any) => m.shared_folders)
        .filter(Boolean);

      setSharedFolders(folders);
      setFriendships(friendData || []);
    } catch (err) {
      console.error('Fetch friendships/folders failed:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriendshipsAndFolders();
    }
  }, [user]);

  // 5. Send Friend Request (Email -> RPC -> Insert)
  const sendFriendRequest = async (friendEmail: string) => {
    if (!user) return;
    try {
      setError(null);
      
      // Resolve email to user_id via definer function
      const { data: friendUserId, error: rpcError } = await supabase
        .rpc('get_user_id_by_email', { email_address: friendEmail });
      
      if (rpcError) throw rpcError;
      if (!friendUserId) {
        throw new Error('No registered user found with that email address.');
      }
      
      if (friendUserId === user.id) {
        throw new Error('You cannot add yourself as a friend.');
      }
      
      // Check for existing relationship
      const existing = friendships.find(
        f => (f.user_id === user.id && f.friend_id === friendUserId) ||
             (f.user_id === friendUserId && f.friend_id === user.id)
      );
      if (existing) {
        throw new Error(existing.status === 'pending' 
          ? 'A pending invitation already exists.' 
          : 'You are already connected with this user.');
      }
      
      const { error: insertError } = await supabase
        .from('friendships')
        .insert([{
          user_id: user.id,
          friend_id: friendUserId,
          status: 'pending'
        }]);
        
      if (insertError) throw insertError;
      
      await fetchFriendshipsAndFolders();
    } catch (err: any) {
      console.error('Send friend request failed:', err);
      setError(err.message || 'Failed to send request.');
      throw err;
    }
  };

  // 6. Accept / Decline Friend Request
  const respondToFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      setError(null);
      if (accept) {
        const { error: updateError } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', requestId);
        if (updateError) throw updateError;
      } else {
        const { error: deleteError } = await supabase
          .from('friendships')
          .delete()
          .eq('id', requestId);
        if (deleteError) throw deleteError;
      }
      await fetchFriendshipsAndFolders();
    } catch (err: any) {
      console.error('Respond to request failed:', err);
      setError(err.message || 'Action failed.');
      throw err;
    }
  };

  // 7. Add Memory Crystal (with folder scoping support)
  const addMemory = async (metadata: MemoryMetadata, imageUrl: string | null, dateStr: string) => {
    try {
      setError(null);
      let currentUser = user;
      if (!currentUser) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        currentUser = authUser;
      }

      if (!currentUser) {
        throw new Error('Authentication session could not be established.');
      }

      const packedText = JSON.stringify(metadata);

      const { data, error: insertError } = await supabase
        .from('memories')
        .insert([
          {
            text: packedText,
            image_url: imageUrl || null,
            date: dateStr,
            user_id: currentUser.id,
            folder_id: activeFolderId || null,
          },
        ])
        .select();

      if (insertError) throw insertError;
      await fetchMemories();
      return data;
    } catch (err: any) {
      console.error('Insert memory crystal failed:', err);
      setError(err.message || 'Failed to crystallized memory.');
      throw err;
    }
  };

  // 8. Delete Memory (Optimistic & High-Performance UI updates with automatic database sync & rollback)
  const deleteMemory = async (id: string) => {
    // 1. Capture the memory synchronously *prior* to executing the async backend delete call
    // This avoids batch scheduling issues and ensures we have the correct rollback target on network failures.
    const memoryToRollback = memories.find((m) => m.id === id);
    if (!memoryToRollback) return;

    try {
      setError(null);
      
      // 2. Perform optimistic UI state deletion
      setMemories((prev) => prev.filter((m) => m.id !== id));

      // 3. Perform asynchronous database deletion
      const { error: deleteError } = await supabase
        .from('memories')
        .delete()
        .eq('id', id);

      if (deleteError) {
        // Rollback: restore the memory to its chronological position
        setMemories((prev) => [...prev, memoryToRollback].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
        setError(deleteError.message);
        throw new Error(deleteError.message);
      }
    } catch (err: any) {
      console.error('Delete memory crystal failed:', err);
      // Rollback on catch (e.g. offline, network failure, fetch errors)
      setMemories((prev) => [...prev, memoryToRollback].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      setError(err.message || 'Failed to delete memory.');
      throw err;
    }
  };

  return {
    memories,
    loading,
    user,
    error,
    addMemory,
    deleteMemory,
    friendships,
    sharedFolders,
    activeFolderId,
    setActiveFolderId,
    sendFriendRequest,
    respondToFriendRequest,
    fetchFriendshipsAndFolders
  };
}
