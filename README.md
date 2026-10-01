# Orçamentos — higienização de estofados

Sistema web para criar e acompanhar orçamentos de higienização (sofás, colchões, tapetes, cadeiras), pensado para usar no celular.

- **Orçamentos** com numeração automática (ORC-0001) e status: rascunho, enviado, aprovado, em andamento, concluído e recusado.
- Dados do cliente, local (apartamento, prédio, casa ou comércio, com bloco/apto), data e hora, itens, desconto em R$ ou %, pagamento à vista ou parcelado, condições e observações.
- **Custos internos** (produto, máquina, aluguel de equipamento, ajudante, transporte, outros) com lucro e margem. **Nunca aparecem no PDF.**
- **PDF para o cliente aprovar**, com seus dados, PIX, serviços, total, forma de pagamento, condições, validade e campo de assinatura. No celular, o botão “Enviar PDF” abre o compartilhamento (WhatsApp, e-mail…).
- **Resumo mensal**: faturamento, custos, lucro, margem, totais por status, custos por tipo e gráfico dos últimos 6 meses.
- **Ajustes**: dados da empresa, logo, condições e validade padrão, catálogo de serviços.
- **Backup e restauração** em arquivo `.json`.
- Login com e-mail e senha: só você acessa.

## Como os números são calculados

| Conta | Fórmula |
|---|---|
| Total do orçamento | soma de (quantidade × valor unitário) − desconto |
| Lucro | total − custos internos |
| Margem | lucro ÷ total |
| Faturamento do mês | soma dos orçamentos **aprovados, em andamento e concluídos** cuja **data do serviço** cai no mês |

Custos e lucro do mês consideram os mesmos orçamentos do faturamento. Um orçamento sem data de serviço entra no mês da data de emissão.

---

## Publicar online (passo a passo)

São três partes, todas gratuitas: **Supabase** (banco de dados e login), **GitHub** (código) e **GitHub Pages** (o site).

### 1. Criar o banco no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e clique em **New project**. Escolha um nome, uma senha forte para o banco e a região **South America (São Paulo)**.
2. Quando o projeto terminar de criar, abra **SQL Editor → New query**, cole todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Deve aparecer “Success”.
3. Bloqueie novos cadastros: **Authentication → Sign In / Providers** e **desligue “Allow new users to sign up”**. Assim ninguém mais consegue criar conta.
4. Crie o seu usuário: **Authentication → Users → Add user → Create new user**. Informe seu e-mail e uma senha e marque **Auto Confirm User**.
5. Anote os dados de conexão em **Project Settings → API** (ou no botão **Connect**):
   - **Project URL** (ex.: `https://abcdefgh.supabase.co`)
   - **anon public key** (um texto longo que começa com `eyJ…`, também chamada de *publishable key*)

> A chave *anon* pode ficar no site: ela só dá acesso ao que as regras do banco permitem, e as regras deste sistema só liberam os dados para o usuário logado. **Nunca** use a chave `service_role` no site.

### 2. Configurar o repositório no GitHub

1. No repositório, vá em **Settings → Secrets and variables → Actions → New repository secret** e crie dois segredos:
   - `VITE_SUPABASE_URL` → a Project URL
   - `VITE_SUPABASE_ANON_KEY` → a anon public key
2. Vá em **Settings → Pages** e, em **Source**, escolha **GitHub Actions**.

> O GitHub Pages gratuito só funciona com repositório **público**. Isso é seguro: o código não tem nenhum dado seu — orçamentos, clientes e configurações ficam no Supabase, protegidos pelo login. Se preferir manter o repositório privado, é preciso um plano pago do GitHub (ou publicar na Vercel/Netlify, que aceitam repositório privado de graça).

### 3. Publicar

Cada envio para a branch `main` publica o site automaticamente (aba **Actions** do repositório). Para publicar na hora, abra **Actions → Publicar no GitHub Pages → Run workflow**.

O endereço fica assim: `https://SEU-USUARIO.github.io/orcamentos-higienizacao/`

### 4. Instalar no celular

Abra o endereço no celular e:
- **Android (Chrome)**: menu ⋮ → **Adicionar à tela inicial** / **Instalar app**.
- **iPhone (Safari)**: botão compartilhar → **Adicionar à Tela de Início**.

### Observações

- No plano gratuito, o Supabase **pausa o projeto depois de 7 dias sem nenhum acesso**. Os dados não se perdem: basta entrar no painel do Supabase e clicar em **Restore project**. Usando o sistema toda semana, isso não acontece.
- Faça um **backup** de vez em quando em **Ajustes → Baixar backup** e guarde o arquivo no Google Drive. A restauração **substitui** todos os dados atuais pelos do arquivo.
- Se o site abrir com a faixa amarela “Modo demonstração”, os segredos do passo 2 não foram configurados: os dados estão sendo salvos só naquele aparelho.

---

## Desenvolvimento

```bash
npm install
cp .env.example .env   # preencha com os dados do Supabase (opcional)
npm run dev            # http://localhost:5173
npm test               # testes dos cálculos e do backup
npm run build
```

Sem o `.env`, o app roda em **modo demonstração**, salvando no navegador — útil para testar sem banco.

### Estrutura

```
supabase/schema.sql      tabelas, regras de acesso, numeração e restauração de backup
src/lib/calc.ts          totais, lucro, margem e resumo mensal
src/lib/pdf.ts           geração do PDF (sem custos internos)
src/lib/api.ts           acesso ao Supabase (ou ao modo demonstração)
src/lib/backup.ts        exportação e leitura de backup
src/pages/               telas: Lista, Editor, Resumo, Configuracoes, Login
```

### Stack

React + TypeScript + Vite, Tailwind CSS, Supabase (Postgres + Auth), jsPDF.
