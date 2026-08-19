// Instância única do client Supabase, exposta como window.HandpathDB.
// Depende de vendor/supabase.min.js (window.supabase.createClient) e de
// config.js (window.HANDPATH_SUPABASE_URL / _ANON_KEY) carregados antes.
(function () {
  "use strict";

  if (!window.supabase || !window.supabase.createClient) {
    throw new Error(
      "supabase-js não carregado — inclua vendor/supabase.min.js antes de client.js"
    );
  }

  window.HandpathDB = window.supabase.createClient(
    window.HANDPATH_SUPABASE_URL,
    window.HANDPATH_SUPABASE_ANON_KEY
  );
})();
