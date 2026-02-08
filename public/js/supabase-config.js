// ============================================================
// Configuration Supabase pour MedApply
// ============================================================
// Remplacez ces valeurs par celles de votre projet Supabase
// Trouvez-les dans : Supabase Dashboard → Settings → API
// ============================================================

window.SUPABASE_URL = 'https://ywrkxyfzapujbdvlexmx.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cmt4eWZ6YXB1amJkdmxleG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzY1MTksImV4cCI6MjA4NjExMjUxOX0.2haSJ4Pt6zBj_e24xIE5J1u9ODaCUzLBD9N-tdxn5Us';

// URL de redirection après authentification OAuth
window.SUPABASE_REDIRECT_URL = window.location.origin + '/auth/callback.html';
