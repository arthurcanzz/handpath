// Config pública do projeto Supabase do Handpath.
// A "anon key" é segura pra expor no client — o controle de acesso real
// é feito pelas RLS policies no banco (ver migrations/0001_init.sql).
// Nunca colocar aqui a service_role/secret key.
(function () {
  "use strict";

  window.HANDPATH_SUPABASE_URL = "https://ehkziiievobwjhhyahie.supabase.co";
  window.HANDPATH_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3ppaWlldm9id2poaHlhaGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMTA5NzIsImV4cCI6MjEwMjU4Njk3Mn0.0IYjb-jT2Ua5zt2RgzypEwx5JD4V0bdX5XBGgdtowYw";
})();
