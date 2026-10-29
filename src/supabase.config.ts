// Dados de conexão com o Supabase (Project Settings > API Keys).
// A chave pública ("anon" ou "publishable") pode ficar no código: ela só dá acesso ao que as regras do
// banco permitem, e as regras deste sistema só liberam os dados para o usuário logado.
// NUNCA coloque aqui a chave "service_role" / "secret".
// Se as variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY existirem, elas têm prioridade.
export const SUPABASE_URL = 'https://fxeuxmkrckqrqsrssuwh.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_rZw6xdlCcaSDF3VMa73Q_Q_MRdj_0Lt'
