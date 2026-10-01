// Dados de conexão com o Supabase (Project Settings > API).
// A "anon public key" pode ficar no código: ela só dá acesso ao que as regras do
// banco permitem, e as regras deste sistema só liberam os dados para o usuário logado.
// NUNCA coloque aqui a chave "service_role".
// Se as variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY existirem, elas têm prioridade.
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''
