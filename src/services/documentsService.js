import { supabase } from '../lib/supabase';

const BUCKET = 'documents';

/**
 * Upload un fichier dans Supabase Storage + crée l'entrée dans la table documents.
 * @returns {{ data: object, error: object }}
 */
export async function uploadDocument(userId, category, file, displayName) {
  // 1. Générer un chemin unique : userId/category/timestamp_filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${category}/${timestamp}_${safeName}`;

  // 2. Upload vers Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[documentsService] Upload error:', uploadError.message);
    return { data: null, error: uploadError };
  }

  // 3. Créer l'entrée dans la table documents
  const { data, error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      category,
      name: displayName || file.name,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
    })
    .select()
    .single();

  if (dbError) {
    console.error('[documentsService] DB insert error:', dbError.message);
    // Nettoyer le fichier uploadé si l'insertion DB échoue
    await supabase.storage.from(BUCKET).remove([filePath]);
    return { data: null, error: dbError };
  }

  return { data, error: null };
}

/**
 * Récupère les documents d'un utilisateur, optionnellement filtrés par catégorie.
 */
export async function getDocuments(userId, category) {
  let query = supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[documentsService] Fetch error:', error.message);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}

/**
 * Supprime un document (fichier storage + entrée DB).
 */
export async function deleteDocument(documentId, filePath) {
  // 1. Supprimer le fichier du storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  if (storageError) {
    console.error('[documentsService] Storage delete error:', storageError.message);
  }

  // 2. Supprimer l'entrée DB
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (dbError) {
    console.error('[documentsService] DB delete error:', dbError.message);
    return { error: dbError };
  }

  return { error: null };
}

/**
 * Génère une URL signée temporaire (1h) pour télécharger un fichier privé.
 */
export async function getSignedUrl(filePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error) {
    console.error('[documentsService] Signed URL error:', error.message);
    return { url: null, error };
  }

  return { url: data.signedUrl, error: null };
}
