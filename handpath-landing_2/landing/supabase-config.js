// Config pública do MESMO projeto Supabase usado pelo trainer/ (ver
// trainer/supabase/config.js) — a landing só usa a tabela `waitlist` dele,
// não é um projeto novo. Duplicado aqui (em vez de referenciar
// ../trainer/supabase/config.js) pra landing/ continuar um pacote
// autocontido, já que é zipada e implantada separadamente do trainer/.
// A "anon key" é segura pra expor no client — quem controla acesso de
// verdade são as RLS policies do banco (ver
// trainer/supabase/migrations/0004_waitlist.sql).
(function () {
  "use strict";

  window.HANDPATH_SUPABASE_URL = "https://ehkziiievobwjhhyahie.supabase.co";
  window.HANDPATH_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3ppaWlldm9id2poaHlhaGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMTA5NzIsImV4cCI6MjEwMjU4Njk3Mn0.0IYjb-jT2Ua5zt2RgzypEwx5JD4V0bdX5XBGgdtowYw";
})();
